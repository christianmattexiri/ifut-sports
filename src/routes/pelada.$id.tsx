import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAvatars } from "@/lib/avatars";
import { PlayerProfileModal } from "@/components/PlayerProfileModal";
import { VotingModal } from "@/components/VotingModal";
import { ApittoResultsModal } from "@/components/ApittoResultsModal";
import { loadAdminSettings } from "@/routes/pelada.$id_.admin";
import {
  loadVotes,
  saveVotes,
  computeWinner,
  computeApitto,
  userHasVoted,
  onVotesUpdated,
  type MatchVotes,
} from "@/lib/voting";
import {
  ArrowLeft,
  Home,
  ClipboardList,
  History,
  BarChart3,
  UserCircle2,
  ShieldCheck,
  Users,
  BarChart,
  User as UserIcon,
  Trophy,
  MapPin,
  Pencil,
  Crown,
  Target,
  Sparkles,
  UserCog,
  Skull,
  Star,
  Lock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isSuperAdminUsername } from "@/lib/admin";

export const Route = createFileRoute("/pelada/$id")({
  component: PeladaPage,
  head: () => ({ meta: [{ title: "iFut — Pelada" }] }),
});

type Match = {
  id: string;
  name: string;
  day_of_week: string | null;
  match_time: string | null;
  location: string | null;
  logo_url: string | null;
  admin_id?: string | null;
};

function PeladaPage() {
  const navigate = useNavigate();
  const { id } = useParams({ from: "/pelada/$id" });
  const [firstName, setFirstName] = useState("Jogador");
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [modalUser, setModalUser] = useState<{ id: string; name: string } | null>(null);
  const [viewerId, setViewerId] = useState<string>("");
  const [voteSettings, setVoteSettings] = useState(() => loadAdminSettings(id).voteModes);
  const [votes, setVotes] = useState<MatchVotes | null>(null);
  const [votingOpen, setVotingOpen] = useState(false);
  const [apittoResultsOpen, setApittoResultsOpen] = useState(false);
  const [counts, setCounts] = useState<{
    line: number;
    lineLimit: number;
    gks: number;
    gkLimit: number;
  }>({ line: 0, lineLimit: 16, gks: 0, gkLimit: 2 });

  type LatestMatch = {
    id: string;
    date: string;
    name: string;
    teamA: { label: string; players: { id: string; name: string; goals: number; assists: number }[] };
    teamB: { label: string; players: { id: string; name: string; goals: number; assists: number }[] };
    mvp: string | null;
    topScorers: string[];
    topAssists: string[];
  };
  const [latest, setLatest] = useState<LatestMatch | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `pelada:${id}:counts`;
    const read = () => {
      try {
        const raw = localStorage.getItem(key);
        if (raw) setCounts((c) => ({ ...c, ...JSON.parse(raw) }));
      } catch {
        /* ignore */
      }
    };
    read();
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) read();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [id]);

  // Read latest match from histórico
  useEffect(() => {
    if (typeof window === "undefined") return;
    const histKey = `pelada:${id}:historico`;
    const read = () => {
      try {
        const raw = localStorage.getItem(histKey);
        if (!raw) return setLatest(null);
        const arr = JSON.parse(raw) as LatestMatch[];
        const sorted = [...arr].sort((a, b) => (a.date < b.date ? 1 : -1));
        setLatest(sorted[0] ?? null);
      } catch {
        setLatest(null);
      }
    };
    read();
    const onStorage = (e: StorageEvent) => {
      if (e.key === histKey) read();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [id]);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/" });
        return;
      }
      const uid = sess.session.user.id;
      setViewerId(uid);
      const [{ data: prof }, { data: m }] = await Promise.all([
        supabase.from("profiles").select("full_name, username").eq("id", uid).maybeSingle(),
        supabase
          .from("matches")
          .select("id, name, day_of_week, match_time, location, logo_url, admin_id")
          .eq("id", id)
          .maybeSingle(),
      ]);
      const full = prof?.full_name?.trim() || prof?.username || "Jogador";
      setFirstName(full.split(" ")[0]);
      const match = m as Match | null;
      setMatch(match);
      const owner = (match?.admin_id ?? null) === uid;
      setIsAdmin(owner || isSuperAdminUsername(prof?.username));
      setLoading(false);
    })();
  }, [navigate, id]);

  // Reload admin vote settings if changed in another tab/page.
  useEffect(() => {
    const reload = () => setVoteSettings(loadAdminSettings(id).voteModes);
    window.addEventListener("storage", reload);
    return () => window.removeEventListener("storage", reload);
  }, [id]);

  // Load + subscribe to votes for the latest match.
  useEffect(() => {
    if (!latest) { setVotes(null); return; }
    setVotes(loadVotes(id, latest.id));
    const off = onVotesUpdated(() => setVotes(loadVotes(id, latest!.id)));
    return off;
  }, [id, latest]);

  const peladaName = match?.name ?? "Minha Pelada";
  const peladaLogo = match?.logo_url ?? null;
  const nextLine = match
    ? [match.day_of_week, match.match_time, match.location].filter(Boolean).join(" • ")
    : "";

  return (
    <main className="relative min-h-screen w-full bg-zinc-950 text-zinc-100 font-sans antialiased">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 left-1/3 h-[480px] w-[480px] rounded-full bg-[#00FF00]/10 blur-[160px]"
      />

      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden w-[280px] shrink-0 flex-col border-r border-white/5 bg-zinc-900/40 px-5 py-5 backdrop-blur-xl md:flex">
          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard" })}
            className="mb-5 inline-flex items-center gap-1.5 self-start rounded-lg px-2 py-1 text-xs font-medium text-zinc-400 transition hover:text-[#00FF00]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao Início do App
          </button>

          <div className="flex flex-col items-center gap-2 pb-6">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[#00FF00]/40 bg-zinc-900 shadow-[0_0_30px_-8px_rgba(0,255,0,0.7)]">
              {peladaLogo ? (
                <img src={peladaLogo} alt={peladaName} className="h-full w-full object-cover" />
              ) : (
                <Trophy className="h-9 w-9 text-[#00FF00]" />
              )}
            </div>
            <p className="text-center text-base font-bold tracking-tight text-white">
              {peladaName}
            </p>
          </div>

          <nav className="space-y-1.5">
            <NavItem icon={<Home className="h-4 w-4" />} label="Início" active />
            <Link to="/pelada/$id/lista" params={{ id }} className="block">
              <NavItem icon={<ClipboardList className="h-4 w-4" />} label="Lista de Presença" />
            </Link>
            <Link to="/pelada/$id/partida" params={{ id }} className="block">
              <NavItem icon={<Trophy className="h-4 w-4" />} label="Partida" gold />
            </Link>
            <Link to="/pelada/$id/historico" params={{ id }} className="block">
              <NavItem icon={<History className="h-4 w-4" />} label="Histórico" />
            </Link>
            <Link to="/pelada/$id/rankings" params={{ id }} className="block"><NavItem icon={<BarChart3 className="h-4 w-4" />} label="Rankings" /></Link>
            <Link to="/pelada/$id/perfil" params={{ id }} className="block"><NavItem icon={<UserCircle2 className="h-4 w-4" />} label="Meu perfil na pelada" /></Link>
          </nav>

          <div className="mt-auto pt-6">
            {isAdmin && (
              <Link to="/pelada/$id/usuarios" params={{ id }} className="mb-2 block">
                <NavItem icon={<UserCog className="h-4 w-4" />} label="Gerenciamento de Usuários" />
              </Link>
            )}
            {isAdmin && (
            <Link to="/pelada/$id/admin" params={{ id }} className="block">
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-xl border border-amber-400/30 bg-amber-400/5 px-3 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-400/10"
              >
                <ShieldCheck className="h-4 w-4" />
                Administrador
              </button>
            </Link>
            )}
          </div>
        </aside>

        <section className="flex-1 px-5 py-8 md:px-10 md:py-10">
          <h1 className="text-3xl font-bold uppercase tracking-tight text-[#00FF00] md:text-4xl">
            Bem-vindo, {firstName}! <span className="inline-block">👋</span>
          </h1>

          <div className="mt-8 flex items-center justify-between gap-4 rounded-2xl border border-[#00FF00]/30 bg-zinc-900/50 px-6 py-5 backdrop-blur-xl shadow-[0_0_40px_-15px_rgba(0,255,0,0.5)]">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-[#00FF00]" />
              {loading ? (
                <p className="text-sm text-zinc-400">Carregando...</p>
              ) : nextLine ? (
                <p className="text-sm font-medium text-zinc-200 md:text-base">
                  Próximo fut: <span className="text-[#00FF00]">{nextLine}</span>
                </p>
              ) : (
                <p className="text-sm font-medium text-zinc-200 md:text-base">
                  Adicione a <span className="text-[#00FF00]">data</span> /{" "}
                  <span className="text-[#00FF00]">local</span> /{" "}
                  <span className="text-[#00FF00]">horário</span> da próxima pelada.
                </p>
              )}
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate({ to: "/pelada/$id/lista", params: { id } })}
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-[#00FF00]"
                aria-label="Editar"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Link to="/pelada/$id/lista" params={{ id }}>
              <QuickCard
                icon={<Users className="h-6 w-6" />}
                label="Presença"
                color="#00FF00"
                badges={[
                  `${counts.line}/${counts.lineLimit} Linha`,
                  `${counts.gks}/${counts.gkLimit} GK`,
                ]}
              />
            </Link>
            <Link to="/pelada/$id/rankings" params={{ id }}>
              <QuickCard icon={<BarChart className="h-6 w-6" />} label="Ranking" color="#fb923c" />
            </Link>
            <Link to="/pelada/$id/perfil" params={{ id }}>
              <QuickCard icon={<UserIcon className="h-6 w-6" />} label="Stats" color="#60a5fa" />
            </Link>
          </div>

          {(() => {
            const all = latest ? [...latest.teamA.players, ...latest.teamB.players] : [];
            const findPlayer = (pid: string | null) =>
              pid ? all.find((p) => p.id === pid) ?? null : null;
            const scoreA = latest ? latest.teamA.players.reduce((a, p) => a + p.goals, 0) : 0;
            const scoreB = latest ? latest.teamB.players.reduce((a, p) => a + p.goals, 0) : 0;
            const matadorPlayers = (latest?.topScorers
              .map((pid) => findPlayer(pid))
              .filter(Boolean) ?? []) as { id: string; name: string }[];
            const matadorGoals = latest?.topScorers[0]
              ? all.find((p) => p.id === latest.topScorers[0])?.goals ?? 0
              : 0;
            const maestroPlayers = (latest?.topAssists
              .map((pid) => findPlayer(pid))
              .filter(Boolean) ?? []) as { id: string; name: string }[];
            const maestroAssists = latest?.topAssists[0]
              ? all.find((p) => p.id === latest.topAssists[0])?.assists ?? 0
              : 0;
            // MVP: prefer admin-set, fallback to vote winner
            const voteMvpId = votes ? computeWinner(votes.mvpVotes).id : null;
            const mvpPlayer = findPlayer(latest?.mvp ?? voteMvpId);
            // Pereba: from votes
            const perebaWinner = votes ? computeWinner(votes.perebaVotes) : { id: null as string | null, count: 0 };
            const perebaPlayer = findPlayer(perebaWinner.id);
            const apittoMode = voteSettings.apitto;
            const perebaMode = voteSettings.pereba;
            const podiumIds = [
              ...matadorPlayers.map((p) => p.id),
              ...maestroPlayers.map((p) => p.id),
              ...(mvpPlayer ? [mvpPlayer.id] : []),
              ...(perebaPlayer ? [perebaPlayer.id] : []),
            ];
            const isParticipant = !!latest && !!viewerId && all.some((p) => p.id === viewerId);
            const anyMode = voteSettings.mvp || voteSettings.pereba || voteSettings.apitto;
            const canVote =
              anyMode &&
              !!votes &&
              !votes.closed &&
              isParticipant &&
              !userHasVoted(votes, viewerId, voteSettings);
            return (
              <>
                <div className="mt-10 rounded-2xl border border-white/5 bg-zinc-900/40 px-6 py-8 backdrop-blur-xl">
                  <div className="flex items-center justify-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-400" />
                    <h2 className="text-lg font-semibold tracking-wide text-zinc-200">
                      Última Partida
                    </h2>
                  </div>
                  <div className="mt-6 flex items-center justify-center gap-10">
                    <div className="text-center">
                      <p className="text-xs uppercase tracking-wider text-zinc-500">
                        {latest?.teamA.label ?? "Time A"}
                      </p>
                      <p className="mt-2 text-5xl font-black text-[#00FF00] drop-shadow-[0_0_20px_rgba(0,255,0,0.6)]">
                        {scoreA}
                      </p>
                    </div>
                    <p className="text-2xl font-light text-zinc-600">vs</p>
                    <div className="text-center">
                      <p className="text-xs uppercase tracking-wider text-zinc-500">
                        {latest?.teamB.label ?? "Time B"}
                      </p>
                      <p className="mt-2 text-5xl font-black text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]">
                        {scoreB}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-center text-xs text-zinc-500">
                    {latest ? latest.name : "Sem registros ainda"}
                  </p>
                </div>

                {/* Voting status & admin controls */}
                {latest && anyMode && (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-xs">
                    {votes?.closed ? (
                      <span className="inline-flex items-center gap-1.5 text-zinc-400">
                        <Lock className="h-3.5 w-3.5" /> Votação encerrada
                      </span>
                    ) : canVote ? (
                      <button
                        type="button"
                        onClick={() => setVotingOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#00FF00]/40 bg-[#00FF00]/10 px-3 py-1.5 font-bold uppercase tracking-wider text-[#00FF00] transition hover:bg-[#00FF00]/20"
                      >
                        <Star className="h-3.5 w-3.5" /> Votar agora
                      </button>
                    ) : isParticipant && votes && userHasVoted(votes, viewerId, voteSettings) ? (
                      <span className="text-[#00FF00]">✓ Você já votou</span>
                    ) : (
                      <span className="text-zinc-500">Votação aberta</span>
                    )}
                    {isAdmin && !votes?.closed && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!latest) return;
                          const v = loadVotes(id, latest.id);
                          saveVotes(id, latest.id, { ...v, closed: true, closedAt: new Date().toISOString() });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 font-bold uppercase tracking-wider text-red-400 transition hover:bg-red-500/20"
                      >
                        <Lock className="h-3.5 w-3.5" /> Encerrar Votação (Admin)
                      </button>
                    )}
                  </div>
                )}

                <div className="mt-10">
                  <div className="mb-5 flex items-center justify-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-400" />
                    <h2 className="text-lg font-semibold tracking-wide text-zinc-200">
                      Pódio da Última Partida
                    </h2>
                  </div>
                  <div className={`grid grid-cols-1 gap-4 md:items-center ${
                    apittoMode ? "md:grid-cols-3" : perebaMode ? "md:grid-cols-4" : "md:grid-cols-3"
                  }`}>
                    <PodiumCard
                      onPick={(p) => setModalUser(p)}
                      icon={<Target className="h-6 w-6" />}
                      title="Matador"
                      subtitle={matadorGoals > 0 ? `${matadorGoals} Gol${matadorGoals > 1 ? "s" : ""}` : "Gols"}
                      color="#fb923c"
                      players={matadorPlayers}
                      podiumIds={podiumIds}
                    />
                    {apittoMode ? (
                      <button
                        type="button"
                        onClick={() => setApittoResultsOpen(true)}
                        className="flex flex-col items-center gap-3 rounded-2xl border border-amber-400 bg-gradient-to-br from-amber-400/15 to-amber-400/5 px-5 py-10 backdrop-blur-xl shadow-[0_0_40px_-10px_rgba(251,191,36,0.7)] transition hover:scale-[1.02]"
                      >
                        <Star className="h-10 w-10 fill-amber-400 text-amber-400" />
                        <p className="text-base font-black uppercase tracking-wider text-amber-400">
                          Notas da Galera
                        </p>
                        <p className="text-xs text-zinc-400">Ver resultados</p>
                      </button>
                    ) : (
                      <PodiumCard
                        onPick={(p) => setModalUser(p)}
                        icon={<Crown className="h-6 w-6" />}
                        title="Craque do Jogo"
                        subtitle="MVP"
                        color="#00FF00"
                        players={mvpPlayer ? [mvpPlayer] : []}
                        highlighted
                        podiumIds={podiumIds}
                      />
                    )}
                    <PodiumCard
                      onPick={(p) => setModalUser(p)}
                      icon={<Sparkles className="h-6 w-6" />}
                      title="Maestro"
                      subtitle={maestroAssists > 0 ? `${maestroAssists} Assist${maestroAssists > 1 ? "s" : ""}` : "Assists"}
                      color="#60a5fa"
                      players={maestroPlayers}
                      podiumIds={podiumIds}
                    />
                    {perebaMode && !apittoMode && (
                      <div
                        className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-red-500/60 bg-red-500/5 px-5 py-8 backdrop-blur-xl shadow-[0_0_30px_-10px_rgba(239,68,68,0.6)]"
                      >
                        <button
                          type="button"
                          onClick={() => perebaPlayer && setModalUser(perebaPlayer)}
                          disabled={!perebaPlayer}
                          className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-red-500 bg-zinc-900 transition hover:scale-105"
                        >
                          {perebaPlayer ? (
                            <span className="text-2xl font-black text-zinc-300">{perebaPlayer.name[0]?.toUpperCase()}</span>
                          ) : (
                            <Skull className="h-10 w-10 text-red-500/60" />
                          )}
                        </button>
                        <p className="px-2 text-center text-sm font-semibold text-zinc-100">
                          {perebaPlayer ? perebaPlayer.name : "Aguardando votos"}
                        </p>
                        <div className="flex items-center gap-2 text-red-500">
                          <Skull className="h-6 w-6" />
                          <p className="text-base font-black uppercase tracking-wider">Pereba</p>
                        </div>
                        <p className="text-xs uppercase tracking-wider text-zinc-500">
                          {perebaWinner.count > 0 ? `${perebaWinner.count} voto${perebaWinner.count > 1 ? "s" : ""}` : "Da Rodada"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </section>
      </div>
      <PlayerProfileModal
        open={!!modalUser}
        onOpenChange={(o) => !o && setModalUser(null)}
        matchId={id}
        userId={modalUser?.id ?? null}
        fallbackName={modalUser?.name}
      />
      {latest && viewerId && (
        <VotingModal
          open={votingOpen}
          onOpenChange={setVotingOpen}
          peladaId={id}
          histId={latest.id}
          voterId={viewerId}
          players={[...latest.teamA.players, ...latest.teamB.players].map((p) => ({ id: p.id, name: p.name }))}
          modes={voteSettings}
        />
      )}
      {latest && (
        <ApittoResultsModal
          open={apittoResultsOpen}
          onOpenChange={setApittoResultsOpen}
          peladaId={id}
          histId={latest.id}
          players={[...latest.teamA.players, ...latest.teamB.players].map((p) => ({ id: p.id, name: p.name }))}
        />
      )}
    </main>
  );
}

function NavItem({ icon, label, active, gold }: { icon: React.ReactNode; label: string; active?: boolean; gold?: boolean }) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-[#00FF00]/10 text-[#00FF00] shadow-[inset_0_0_0_1px_rgba(0,255,0,0.25)]"
          : gold
          ? "text-yellow-500 hover:bg-yellow-500/10"
          : "text-zinc-300 hover:bg-white/5 hover:text-zinc-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function QuickCard({
  icon,
  label,
  color,
  badges,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  badges?: string[];
}) {
  return (
    <button
      type="button"
      className="group flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-zinc-900/40 px-5 py-6 backdrop-blur-xl transition-all duration-200 hover:scale-[1.02] hover:border-[var(--qc-color)] hover:shadow-[0_0_30px_-8px_var(--qc-color)]"
      style={{ ["--qc-color" as string]: color }}
    >
      <div className="flex items-center gap-3">
        <span style={{ color }} className="transition group-hover:drop-shadow-[0_0_10px_currentColor]">
          {icon}
        </span>
        <span className="text-sm font-semibold uppercase tracking-wider text-zinc-200">{label}</span>
      </div>
      {badges && badges.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {badges.map((b) => (
            <span
              key={b}
              className="rounded-md border px-2 py-0.5 text-[11px] font-bold tabular-nums"
              style={{ borderColor: `${color}55`, color }}
            >
              {b}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

function PodiumCard({
  onPick,
  icon,
  title,
  subtitle,
  color,
  highlighted,
  players,
  podiumIds,
}: {
  onPick: (p: { id: string; name: string }) => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
  highlighted?: boolean;
  players?: { id: string; name: string }[];
  podiumIds?: string[];
}) {
  const ids = podiumIds ?? (players?.map((p) => p.id) ?? []);
  const avMap = useAvatars(ids);
  const first = players?.[0];
  const av = first ? avMap[first.id]?.avatar_url : null;
  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-2xl border bg-zinc-900/50 px-5 backdrop-blur-xl transition ${
        highlighted ? "border-[var(--pc-color)] py-10 shadow-[0_0_40px_-10px_var(--pc-color)]" : "border-white/10 py-8"
      }`}
      style={{ ["--pc-color" as string]: color }}
    >
      <button
        type="button"
        onClick={() => first && onPick(first)}
        disabled={!first}
        className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 bg-zinc-900 transition hover:scale-105"
        style={{ borderColor: color }}
      >
        {av ? (
          <img src={av} alt={first?.name ?? ""} className="h-full w-full object-cover" />
        ) : first ? (
          <span className="text-2xl font-black text-zinc-300">{first.name[0]?.toUpperCase()}</span>
        ) : (
          <UserCircle2 className="h-10 w-10 text-zinc-700" />
        )}
      </button>
      {players && players.length > 0 ? (
        <p className="px-2 text-center text-sm font-semibold text-zinc-100">
          {players.map((p, i) => (
            <span key={p.id}>
              {i > 0 && ", "}
              <button
                type="button"
                onClick={() => onPick(p)}
                className="hover:text-[#00FF00] hover:underline"
              >
                {p.name}
              </button>
            </span>
          ))}
        </p>
      ) : (
        <p className="text-sm text-zinc-500">Aguardando partida</p>
      )}
      <div className="flex items-center gap-2" style={{ color }}>
        {icon}
        <p className="text-base font-bold uppercase tracking-wider">{title}</p>
      </div>
      <p className="text-xs uppercase tracking-wider text-zinc-500">{subtitle}</p>
    </div>
  );
}
