import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAvatars } from "@/lib/avatars";
import { PlayerProfileModal } from "@/components/PlayerProfileModal";
import { VotingModal } from "@/components/VotingModal";
import { ApittoResultsModal } from "@/components/ApittoResultsModal";
import { AdminVotingAuditModal } from "@/components/AdminVotingAuditModal";
import { loadAdminSettings } from "@/routes/pelada.$id_.admin";
import {
  loadVotes,
  saveVotes,
  computeWinner,
  userHasVoted,
  onVotesUpdated,
  isLeaderMathLocked,
  computeApitto,
  type MatchVotes,
} from "@/lib/voting";
import { loadHistory, saveHistory } from "@/routes/pelada.$id_.historico";
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
  Eye,
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
  is_pro?: boolean | null;
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
  const [adminSettings, setAdminSettings] = useState(() => loadAdminSettings(id));
  // Vote modes are gated by the master "Votações" module switch.
  const voteSettings = adminSettings.modules.votacoes
    ? adminSettings.voteModes
    : { mvp: false, pereba: false, apitto: false };
  const podiumDisplay = adminSettings.podium;
  const modules = adminSettings.modules;
  const accent = adminSettings.accent || "var(--pelada-accent)";
  const [votes, setVotes] = useState<MatchVotes | null>(null);
  const [votingOpen, setVotingOpen] = useState(false);
  const [apittoResultsOpen, setApittoResultsOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [validVoterIds, setValidVoterIds] = useState<string[]>([]);
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
          .select("id, name, day_of_week, match_time, location, logo_url, admin_id, is_pro")
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
    const reload = () => setAdminSettings(loadAdminSettings(id));
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

  // Resolve which match players are real registered users (valid voters).
  // Guests added via "Chamar amigo" get random UUIDs that don't exist in profiles.
  useEffect(() => {
    if (!latest) { setValidVoterIds([]); return; }
    const ids = [...latest.teamA.players, ...latest.teamB.players].map((p) => p.id);
    if (ids.length === 0) { setValidVoterIds([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("profiles").select("id").in("id", ids);
      if (cancelled) return;
      setValidVoterIds((data ?? []).map((r) => r.id as string));
    })();
    return () => { cancelled = true; };
  }, [latest]);

  // Auto-close: 100% quorum OR mathematical leader lock.
  useEffect(() => {
    if (!latest || !votes || votes.closed) return;
    const anyMode = voteSettings.mvp || voteSettings.pereba || voteSettings.apitto;
    if (!anyMode) return;
    if (validVoterIds.length === 0) return;
    const total = validVoterIds.length;
    const allDone = validVoterIds.every((vid) => userHasVoted(votes, vid, voteSettings));
    // Mathematical lock applies to MVP/Pereba (winner-take-all). Apitto is averaged
    // and only closes by full quorum or admin force.
    const mvpLocked = voteSettings.mvp ? isLeaderMathLocked(votes.mvpVotes, total) : true;
    const perebaLocked = voteSettings.pereba ? isLeaderMathLocked(votes.perebaVotes, total) : true;
    const mathLocked =
      (voteSettings.mvp || voteSettings.pereba) &&
      !voteSettings.apitto &&
      mvpLocked &&
      perebaLocked;
    if (allDone || mathLocked) {
      closeAndPersist(votes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest, votes, voteSettings, validVoterIds, id]);

  // Persist winners back into the history record so Rankings/Profile pick them up,
  // then mark the votes as closed.
  function closeAndPersist(current: MatchVotes) {
    if (!latest) return;
    const list = loadHistory(id);
    const idx = list.findIndex((h) => h.id === latest.id);
    if (idx >= 0) {
      const h = { ...list[idx] };
      if (voteSettings.mvp && !h.mvp) {
        const w = computeWinner(current.mvpVotes).id;
        if (w) h.mvp = w;
      }
      if (voteSettings.pereba) {
        const w = computeWinner(current.perebaVotes).id;
        if (w) h.pereba = w;
      }
      // Apitto: 1º colocado vira MVP, último vira Pereba.
      // Idempotente: só seta se ainda não estiver definido (não soma duas vezes
      // se o modal de resultados for reaberto).
      if (voteSettings.apitto) {
        const ranked = computeApitto(current.apitto);
        if (ranked.length > 0) {
          if (!h.mvp) h.mvp = ranked[0].id;
          if (ranked.length > 1 && !h.pereba) h.pereba = ranked[ranked.length - 1].id;
        }
      }
      list[idx] = h;
      saveHistory(id, list);
      setLatest(h as typeof latest);
    }
    saveVotes(id, latest.id, { ...current, closed: true, closedAt: new Date().toISOString() });
  }

  // Auto-open voting modal once per session if the viewer is eligible.
  const [autoShown, setAutoShown] = useState<string | null>(null);
  useEffect(() => {
    if (!latest || !viewerId || !votes) return;
    if (votes.closed) return;
    if (autoShown === latest.id) return;
    const anyMode = voteSettings.mvp || voteSettings.pereba || voteSettings.apitto;
    if (!anyMode) return;
    const all = [...latest.teamA.players, ...latest.teamB.players];
    if (!all.some((p) => p.id === viewerId)) return;
    if (userHasVoted(votes, viewerId, voteSettings)) return;
    setVotingOpen(true);
    setAutoShown(latest.id);
  }, [latest, viewerId, votes, voteSettings, autoShown]);

  const peladaName = match?.name ?? "Minha Pelada";
  const peladaLogo = match?.logo_url ?? null;
  const isPro = !!match?.is_pro;
  const nextLine = match
    ? [match.day_of_week, match.match_time, match.location].filter(Boolean).join(" • ")
    : "";

  return (
    <main
      className="relative min-h-screen w-full bg-zinc-950 text-zinc-100 font-sans antialiased pb-20"
      style={{ ["--pelada-accent" as string]: accent }}
    >
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 left-1/3 h-[480px] w-[480px] rounded-full bg-[var(--pelada-accent)]/10 blur-[160px]"
      />

      <div className="relative z-10 flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 flex-col border-r border-white/5 bg-zinc-900/40 px-5 pt-5 pb-24 backdrop-blur-xl md:flex">
          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard" })}
            className="mb-5 inline-flex items-center gap-1.5 self-start rounded-lg px-2 py-1 text-xs font-medium text-zinc-400 transition hover:text-[var(--pelada-accent)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao Início do App
          </button>

          <div className="flex flex-col items-center gap-2 pb-6">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[var(--pelada-accent)]/40 bg-zinc-900 shadow-[0_0_30px_-8px_color-mix(in_oklab,var(--pelada-accent)_70%,transparent)]">
                {peladaLogo ? (
                  <img src={peladaLogo} alt={peladaName} className="h-full w-full object-cover" />
                ) : (
                  <Trophy className="h-9 w-9 text-[var(--pelada-accent)]" />
                )}
              </div>
              {isPro && <ProTag className="absolute -right-2 -top-1" />}
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
            {modules.rankings && (
              <Link to="/pelada/$id/rankings" params={{ id }} className="block"><NavItem icon={<BarChart3 className="h-4 w-4" />} label="Rankings" /></Link>
            )}
            <Link to="/pelada/$id/perfil" params={{ id }} className="block"><NavItem icon={<UserCircle2 className="h-4 w-4" />} label="Meu perfil na pelada" /></Link>
          </nav>

          <div className="mt-auto space-y-1.5 pt-6">
            {isAdmin && (
              <Link to="/pelada/$id/usuarios" params={{ id }} className="block">
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
          <h1 className="text-3xl font-bold uppercase tracking-tight text-[var(--pelada-accent)] md:text-4xl">
            Bem-vindo, {firstName}! <span className="inline-block">👋</span>
          </h1>

          <div className="mt-8 flex items-center justify-between gap-4 rounded-2xl border border-[var(--pelada-accent)]/30 bg-zinc-900/50 px-6 py-5 backdrop-blur-xl shadow-[0_0_40px_-15px_color-mix(in_oklab,var(--pelada-accent)_50%,transparent)]">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-[var(--pelada-accent)]" />
              {loading ? (
                <p className="text-sm text-zinc-400">Carregando...</p>
              ) : nextLine ? (
                <p className="text-sm font-medium text-zinc-200 md:text-base">
                  Próximo fut: <span className="text-[var(--pelada-accent)]">{nextLine}</span>
                </p>
              ) : (
                <p className="text-sm font-medium text-zinc-200 md:text-base">
                  Adicione a <span className="text-[var(--pelada-accent)]">data</span> /{" "}
                  <span className="text-[var(--pelada-accent)]">local</span> /{" "}
                  <span className="text-[var(--pelada-accent)]">horário</span> da próxima pelada.
                </p>
              )}
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate({ to: "/pelada/$id/lista", params: { id } })}
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-[var(--pelada-accent)]"
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
                color="var(--pelada-accent)"
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
            const anyMode = voteSettings.mvp || voteSettings.pereba || voteSettings.apitto;
            const pollOpen = anyMode && !!votes && !votes.closed;
            const mvpVotingActive =
              voteSettings.mvp && pollOpen && !latest?.mvp;
            // Hide partial results while the urn is open (blind voting).
            const showMvpWinner = !!mvpPlayer && (!voteSettings.mvp || !pollOpen || !!latest?.mvp);
            const showPerebaWinner = !!perebaPlayer && !pollOpen;
            const podiumIds = [
              ...matadorPlayers.map((p) => p.id),
              ...maestroPlayers.map((p) => p.id),
              ...(showMvpWinner ? [mvpPlayer!.id] : []),
              ...(showPerebaWinner ? [perebaPlayer!.id] : []),
            ];
            const isParticipant = !!latest && !!viewerId && all.some((p) => p.id === viewerId);
            const canVote =
              anyMode &&
              !!votes &&
              !votes.closed &&
              isParticipant &&
              !userHasVoted(votes, viewerId, voteSettings);
            // Build the dynamic podium card list based on admin display toggles.
            const podiumCards: React.ReactNode[] = [];
            if (podiumDisplay.matador) {
              podiumCards.push(
                <PodiumCard key="matador"
                  onPick={(p) => setModalUser(p)}
                  icon={<Target className="h-6 w-6" />}
                  title="Matador"
                  subtitle={matadorGoals > 0 ? `${matadorGoals} Gol${matadorGoals > 1 ? "s" : ""}` : "Gols"}
                  color="#fb923c"
                  players={matadorPlayers}
                  podiumIds={podiumIds}
                />,
              );
            }
            if (podiumDisplay.mvp && !apittoMode) {
              podiumCards.push(
                mvpVotingActive && !mvpPlayer ? (
                  <div key="mvp-wait" className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--pelada-accent)]/60 bg-[var(--pelada-accent)]/5 px-5 py-10 backdrop-blur-xl shadow-[0_0_30px_-10px_color-mix(in_oklab,var(--pelada-accent)_60%,transparent)]">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[var(--pelada-accent)] bg-zinc-900">
                      <Crown className="h-10 w-10 text-[var(--pelada-accent)]/70 animate-pulse" />
                    </div>
                    <p className="px-2 text-center text-sm font-semibold text-zinc-100">Aguardando votação</p>
                    <div className="flex items-center gap-2 text-[var(--pelada-accent)]">
                      <Crown className="h-6 w-6" />
                      <p className="text-base font-black uppercase tracking-wider">MVP</p>
                    </div>
                    <p className="text-xs uppercase tracking-wider text-zinc-500">Craque do Jogo</p>
                  </div>
                ) : (
                  <PodiumCard key="mvp"
                    onPick={(p) => setModalUser(p)}
                    icon={<Crown className="h-6 w-6" />}
                    title="Craque do Jogo"
                    subtitle="MVP"
                    color="var(--pelada-accent)"
                    players={showMvpWinner ? [mvpPlayer!] : []}
                    highlighted
                    podiumIds={podiumIds}
                  />
                ),
              );
            }
            if (podiumDisplay.apitto && apittoMode) {
              podiumCards.push(
                <button key="apitto" type="button"
                  onClick={() => { if (!pollOpen) setApittoResultsOpen(true); }}
                  disabled={pollOpen}
                  className={`flex flex-col items-center gap-3 rounded-2xl border px-5 py-10 backdrop-blur-xl transition ${
                    pollOpen
                      ? "cursor-not-allowed border-dashed border-amber-400/50 bg-amber-400/5"
                      : "border-amber-400 bg-gradient-to-br from-amber-400/15 to-amber-400/5 shadow-[0_0_40px_-10px_rgba(251,191,36,0.7)] hover:scale-[1.02]"
                  }`}
                >
                  <Star className={`h-10 w-10 ${pollOpen ? "text-amber-400/60 animate-pulse" : "fill-amber-400 text-amber-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.9)]"}`} />
                  <p className="text-base font-black uppercase tracking-wider text-amber-400">Notas da Galera</p>
                  <p className="text-xs text-zinc-400">{pollOpen ? "Aguardando votação..." : "Ver resultados"}</p>
                </button>,
              );
            }
            if (podiumDisplay.maestro) {
              podiumCards.push(
                <PodiumCard key="maestro"
                  onPick={(p) => setModalUser(p)}
                  icon={<Sparkles className="h-6 w-6" />}
                  title="Maestro"
                  subtitle={maestroAssists > 0 ? `${maestroAssists} Assist${maestroAssists > 1 ? "s" : ""}` : "Assists"}
                  color="#60a5fa"
                  players={maestroPlayers}
                  podiumIds={podiumIds}
                />,
              );
            }
            if (podiumDisplay.pereba && perebaMode && !apittoMode) {
              podiumCards.push(
                <div key="pereba" className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-red-500/60 bg-red-500/5 px-5 py-8 backdrop-blur-xl shadow-[0_0_30px_-10px_rgba(239,68,68,0.6)]">
                  <button type="button"
                    onClick={() => showPerebaWinner && setModalUser(perebaPlayer!)}
                    disabled={!showPerebaWinner}
                    className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-red-500 bg-zinc-900 transition hover:scale-105"
                  >
                    {showPerebaWinner ? (
                      <SinglePlayerAvatar player={perebaPlayer!} fallbackColor="#ef4444" />
                    ) : (
                      <Skull className={`h-10 w-10 text-red-500/60 ${pollOpen ? "animate-pulse" : ""}`} />
                    )}
                  </button>
                  <p className="px-2 text-center text-sm font-semibold text-zinc-100">
                    {showPerebaWinner ? perebaPlayer!.name : pollOpen ? "Aguardando votação" : "Aguardando votos"}
                  </p>
                  <div className="flex items-center gap-2 text-red-500">
                    <Skull className="h-6 w-6" />
                    <p className="text-base font-black uppercase tracking-wider">Pereba</p>
                  </div>
                  <p className="text-xs uppercase tracking-wider text-zinc-500">
                    {showPerebaWinner && perebaWinner.count > 0
                      ? `${perebaWinner.count} voto${perebaWinner.count > 1 ? "s" : ""}`
                      : "Da Rodada"}
                  </p>
                </div>,
              );
            }
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
                      <p className="mt-2 text-5xl font-black text-[var(--pelada-accent)] drop-shadow-[0_0_20px_color-mix(in_oklab,var(--pelada-accent)_60%,transparent)]">
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
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--pelada-accent)]/40 bg-[var(--pelada-accent)]/10 px-3 py-1.5 font-bold uppercase tracking-wider text-[var(--pelada-accent)] transition hover:bg-[var(--pelada-accent)]/20"
                      >
                        <Star className="h-3.5 w-3.5" /> Votar agora
                      </button>
                    ) : isParticipant && votes && userHasVoted(votes, viewerId, voteSettings) ? (
                      <span className="text-[var(--pelada-accent)]">✓ Você já votou</span>
                    ) : (
                      <span className="text-zinc-500">Votação aberta</span>
                    )}
                    {isAdmin && !votes?.closed && (
                      <button
                        type="button"
                        onClick={() => setAuditOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 font-bold uppercase tracking-wider text-amber-300 transition hover:bg-amber-400/20"
                      >
                        <Eye className="h-3.5 w-3.5" /> Auditoria (Admin)
                      </button>
                    )}
                    {isAdmin && !votes?.closed && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!latest || !votes) return;
                          closeAndPersist(votes);
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
                  {podiumCards.length === 0 ? (
                    <p className="text-center text-sm text-zinc-500">Nenhum card do pódio ativo. Habilite em Administrador.</p>
                  ) : (
                    <div className="flex flex-wrap items-stretch justify-center gap-4">
                      {podiumCards.map((c, i) => (
                        <div key={i} className="w-full sm:w-[280px] md:w-[300px]">{c}</div>
                      ))}
                    </div>
                  )}
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
      {latest && isAdmin && (
        <AdminVotingAuditModal
          open={auditOpen}
          onOpenChange={setAuditOpen}
          votes={votes}
          players={[...latest.teamA.players, ...latest.teamB.players].map((p) => ({ id: p.id, name: p.name }))}
          validVoterIds={validVoterIds}
          modes={voteSettings}
          onForceClose={() => votes && closeAndPersist(votes)}
        />
      )}
      {/* Audio player & accent are mounted globally in PeladaGlobalShell so
          they persist while navigating between sub-routes. */}
    </main>
  );
}

export function ProTag({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-950 shadow-[0_0_12px_-2px_rgba(251,191,36,0.9)] ring-1 ring-amber-200/80 ${className}`}
    >
      PRO
    </span>
  );
}

function NavItem({ icon, label, active, gold }: { icon: React.ReactNode; label: string; active?: boolean; gold?: boolean }) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-[var(--pelada-accent)]/10 text-[var(--pelada-accent)] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--pelada-accent)_25%,transparent)]"
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
  const list = players ?? [];
  return (
    <div
      className={`flex h-full flex-col items-center gap-3 rounded-2xl border bg-zinc-900/50 px-5 backdrop-blur-xl transition ${
        highlighted ? "border-[var(--pc-color)] py-10 shadow-[0_0_40px_-10px_var(--pc-color)]" : "border-white/10 py-8"
      }`}
      style={{ ["--pc-color" as string]: color }}
    >
      {list.length > 0 ? (
        <div className="flex max-w-full flex-wrap items-center justify-center gap-2">
          {list.map((p) => {
            const url = avMap[p.id]?.avatar_url;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPick(p)}
                className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 bg-zinc-900 transition hover:scale-105"
                style={{ borderColor: color }}
                title={p.name}
              >
                {url ? (
                  <img src={url} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-black text-zinc-300">{p.name[0]?.toUpperCase()}</span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/10 bg-zinc-900">
          <UserCircle2 className="h-10 w-10 text-zinc-700" />
        </div>
      )}
      {list.length > 0 ? (
        <p className="px-2 text-center text-sm font-semibold text-zinc-100">
          {list.map((p, i) => (
            <span key={p.id}>
              {i > 0 && ", "}
              <button
                type="button"
                onClick={() => onPick(p)}
                className="hover:text-[var(--pelada-accent)] hover:underline"
              >
                {p.name}
              </button>
            </span>
          ))}
        </p>
      ) : (
        <p className="text-sm text-zinc-500">Aguardando partida</p>
      )}
      <div className="mt-auto flex items-center gap-2" style={{ color }}>
        {icon}
        <p className="text-base font-bold uppercase tracking-wider">{title}</p>
      </div>
      <p className="text-xs uppercase tracking-wider text-zinc-500">{subtitle}</p>
    </div>
  );
}

function SinglePlayerAvatar({ player, fallbackColor }: { player: { id: string; name: string }; fallbackColor?: string }) {
  const av = useAvatars([player.id]);
  const url = av[player.id]?.avatar_url;
  if (url) return <img src={url} alt={player.name} className="h-full w-full object-cover" />;
  return (
    <span className="text-2xl font-black" style={{ color: fallbackColor ?? "#e4e4e7" }}>
      {player.name[0]?.toUpperCase()}
    </span>
  );
}
