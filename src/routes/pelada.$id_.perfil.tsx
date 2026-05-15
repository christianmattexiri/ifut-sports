import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Home,
  ClipboardList,
  History as HistoryIcon,
  BarChart3,
  UserCircle2,
  ShieldCheck,
  Trophy,
  UserCog,
  Target,
  Handshake,
  Gamepad2,
  Pencil,
  Clock,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isSuperAdminUsername } from "@/lib/admin";
import { ProfileDialog } from "@/components/ProfileDialog";
import { loadHistory, type HistMatch } from "./pelada.$id_.historico";

export const Route = createFileRoute("/pelada/$id_/perfil")({
  component: PerfilPage,
  head: () => ({ meta: [{ title: "iFut — Meu Perfil" }] }),
});

type Match = {
  id: string;
  name: string;
  logo_url: string | null;
  admin_id?: string | null;
};

function formatDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function PerfilPage() {
  const navigate = useNavigate();
  const { id } = useParams({ from: "/pelada/$id_/perfil" });
  const [match, setMatch] = useState<Match | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [fullName, setFullName] = useState("Jogador");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<HistMatch[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    setHistory(loadHistory(id));
  }, [id]);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/" });
        return;
      }
      const uid = sess.session.user.id;
      setUserId(uid);
      const [{ data: prof }, { data: m }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, username, avatar_url")
          .eq("id", uid)
          .maybeSingle(),
        supabase
          .from("matches")
          .select("id, name, logo_url, admin_id")
          .eq("id", id)
          .maybeSingle(),
      ]);
      setFullName(prof?.full_name || prof?.username || "Jogador");
      setUsername(prof?.username || "");
      setAvatarUrl(prof?.avatar_url ?? null);
      const mm = m as Match | null;
      setMatch(mm);
      setIsAdmin((mm?.admin_id ?? null) === uid || isSuperAdminUsername(prof?.username));
    })();
  }, [navigate, id]);

  // TODO: Fazer um SELECT na tabela de histórico de partidas filtrando por
  // match_id e user_id, e somar as estatísticas (SUM) para preencher o Grid superior.
  // Por enquanto, agregamos do localStorage do histórico, filtrando partidas
  // em que o usuário logado participou (por nome — ideal seria por user_id).

  const myName = (fullName || username || "").trim();

  const myMatches = useMemo(() => {
    if (!myName) return [] as HistMatch[];
    const key = myName.toLowerCase();
    return history.filter((h) =>
      [...h.teamA.players, ...h.teamB.players].some(
        (p) => p.name.trim().toLowerCase() === key,
      ),
    );
  }, [history, myName]);

  const stats = useMemo(() => {
    let goals = 0;
    let assists = 0;
    let mvp = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    const key = myName.trim().toLowerCase();
    for (const m of myMatches) {
      const all = [...m.teamA.players, ...m.teamB.players];
      const me = all.find((p) => p.name.trim().toLowerCase() === key);
      if (!me) continue;
      goals += me.goals || 0;
      assists += me.assists || 0;
      if (m.mvp === me.id) mvp += 1;
      const sa = m.teamA.players.reduce((a, p) => a + (p.goals || 0), 0);
      const sb = m.teamB.players.reduce((a, p) => a + (p.goals || 0), 0);
      const inA = m.teamA.players.some((p) => p.id === me.id);
      const myScore = inA ? sa : sb;
      const oppScore = inA ? sb : sa;
      if (myScore > oppScore) wins += 1;
      else if (myScore === oppScore) draws += 1;
      else losses += 1;
    }
    const games = myMatches.length;
    const winRate = games > 0 ? Math.round((wins / games) * 100) : 0;
    return { goals, assists, mvp, wins, draws, losses, games, winRate };
  }, [myMatches, myName]);

  const peladaName = match?.name ?? "Minha Pelada";
  const peladaLogo = match?.logo_url ?? null;
  const teamMock = "Rafael Borré F.C"; // TODO: substituir por nome do time real
  const positionMock = "Volante"; // TODO: substituir por posição salva no perfil da pelada

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
            onClick={() => navigate({ to: "/pelada/$id", params: { id } })}
            className="mb-5 inline-flex items-center gap-1.5 self-start rounded-lg px-2 py-1 text-xs font-medium text-zinc-400 transition hover:text-[#00FF00]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar à Pelada
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
            <Link to="/pelada/$id" params={{ id }} className="block">
              <NavItem icon={<Home className="h-4 w-4" />} label="Início" />
            </Link>
            <Link to="/pelada/$id/lista" params={{ id }} className="block">
              <NavItem icon={<ClipboardList className="h-4 w-4" />} label="Lista de Presença" />
            </Link>
            <Link to="/pelada/$id/partida" params={{ id }} className="block">
              <NavItem icon={<Trophy className="h-4 w-4" />} label="Partida" gold />
            </Link>
            <Link to="/pelada/$id/historico" params={{ id }} className="block">
              <NavItem icon={<HistoryIcon className="h-4 w-4" />} label="Histórico" />
            </Link>
            <Link to="/pelada/$id/rankings" params={{ id }} className="block">
              <NavItem icon={<BarChart3 className="h-4 w-4" />} label="Rankings" />
            </Link>
            <NavItem icon={<UserCircle2 className="h-4 w-4" />} label="Meu perfil na pelada" active />
          </nav>

          <div className="mt-auto pt-6">
            {isAdmin && (
              <Link to="/pelada/$id/usuarios" params={{ id }} className="mb-2 block">
                <NavItem icon={<UserCog className="h-4 w-4" />} label="Gerenciamento de Usuários" />
              </Link>
            )}
            {isAdmin && (
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-xl border border-amber-400/30 bg-amber-400/5 px-3 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-400/10"
              >
                <ShieldCheck className="h-4 w-4" />
                Administrador
              </button>
            )}
          </div>
        </aside>

        <section className="flex-1 px-5 py-8 md:px-10 md:py-10">
          <div className="mx-auto max-w-3xl">
            {/* Edit Profile */}
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#00FF00]/40 bg-transparent px-5 py-2.5 text-sm font-bold uppercase tracking-[0.2em] text-[#00FF00] transition hover:bg-[#00FF00]/10 hover:shadow-[0_0_20px_-5px_rgba(0,255,0,0.6)]"
            >
              <Pencil className="h-4 w-4" />
              Editar Perfil
            </button>

            {/* Header card */}
            <div className="relative mt-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 p-8 backdrop-blur-xl">
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-amber-400 bg-zinc-900 shadow-[0_0_30px_-5px_rgba(251,191,36,0.6)]">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
                  ) : (
                    <UserCircle2 className="h-14 w-14 text-zinc-600" />
                  )}
                </div>
                <h2 className="text-3xl font-black uppercase tracking-wider text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]">
                  {(username || fullName).toUpperCase()}
                </h2>
                <p className="text-sm font-medium text-[#00FF00]">"{username || fullName}"</p>
                <p className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                  {teamMock}
                </p>
                <p className="text-xs italic text-zinc-500">{positionMock}</p>

                <div className="mt-4 inline-flex items-center gap-3 rounded-xl border-2 border-amber-400/60 bg-amber-400/5 px-6 py-3 shadow-[0_0_30px_-5px_rgba(251,191,36,0.5)]">
                  <span className="font-mono text-4xl font-black tabular-nums text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]">
                    {stats.goals + stats.assists}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400/80">
                    G+A
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <StatCard
                icon={<Target className="h-5 w-5" />}
                value={stats.goals}
                label="Gols"
                color="#fb923c"
              />
              <StatCard
                icon={<Handshake className="h-5 w-5" />}
                value={stats.assists}
                label="Assists"
                color="#60a5fa"
              />
              <StatCard
                icon={<Trophy className="h-5 w-5" />}
                value={stats.mvp}
                label="MVP"
                color="#facc15"
              />
              <StatCard
                icon={<Gamepad2 className="h-5 w-5" />}
                value={stats.games}
                label="Jogos"
                color="#00FF00"
              />
            </div>

            {/* Win/Draw/Loss row */}
            <div className="mt-4 grid grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-zinc-900/40 px-4 py-4 backdrop-blur-xl">
              <RecordCell value={stats.wins} label="Vitórias" color="text-[#00FF00]" />
              <RecordCell value={stats.draws} label="Empates" color="text-zinc-400" />
              <RecordCell value={stats.losses} label="Derrotas" color="text-red-500" />
              <RecordCell value={`${stats.winRate}%`} label="Win Rate" color="text-white" />
            </div>

            {/* My Matches */}
            <div className="mt-10">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-400" />
                <h3 className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">
                  Meus Últimos Jogos
                </h3>
              </div>

              {myMatches.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/30 px-6 py-12 text-center">
                  <p className="text-sm text-zinc-500">
                    Você ainda não participou de nenhuma partida nesta pelada.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myMatches
                    .slice()
                    .sort((a, b) => (a.date < b.date ? 1 : -1))
                    .map((m) => (
                      <MyMatchAccordion
                        key={m.id}
                        m={m}
                        myName={myName}
                        open={openId === m.id}
                        onToggle={() => setOpenId(openId === m.id ? null : m.id)}
                      />
                    ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {userId && (
        <ProfileDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          userId={userId}
          fullName={fullName}
          username={username}
          avatarUrl={avatarUrl}
          fallbackAvatar={(username || fullName).slice(0, 2).toUpperCase()}
          onUpdated={(d) => {
            if (d.full_name !== undefined) setFullName(d.full_name);
            if (d.avatar_url !== undefined) setAvatarUrl(d.avatar_url);
          }}
        />
      )}
    </main>
  );
}

function NavItem({
  icon,
  label,
  active,
  gold,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  gold?: boolean;
}) {
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

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-zinc-900/40 px-4 py-6 backdrop-blur-xl transition hover:border-[var(--sc-color)]"
      style={{ ["--sc-color" as string]: `${color}55` }}
    >
      <span style={{ color }}>{icon}</span>
      <p
        className="font-mono text-3xl font-black tabular-nums"
        style={{ color, textShadow: `0 0 12px ${color}66` }}
      >
        {value}
      </p>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">{label}</p>
    </div>
  );
}

function RecordCell({
  value,
  label,
  color,
}: {
  value: number | string;
  label: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <p className={`font-mono text-2xl font-black tabular-nums ${color}`}>{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">{label}</p>
    </div>
  );
}

function MyMatchAccordion({
  m,
  myName,
  open,
  onToggle,
}: {
  m: HistMatch;
  myName: string;
  open: boolean;
  onToggle: () => void;
}) {
  const sa = m.teamA.players.reduce((a, p) => a + (p.goals || 0), 0);
  const sb = m.teamB.players.reduce((a, p) => a + (p.goals || 0), 0);
  const key = myName.trim().toLowerCase();
  const inA = m.teamA.players.some((p) => p.name.trim().toLowerCase() === key);
  const me =
    m.teamA.players.find((p) => p.name.trim().toLowerCase() === key) ||
    m.teamB.players.find((p) => p.name.trim().toLowerCase() === key);
  const myScore = inA ? sa : sb;
  const oppScore = inA ? sb : sa;
  const win = myScore > oppScore;
  const draw = myScore === oppScore;

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-zinc-900/40 backdrop-blur-xl transition ${
        win
          ? "border-[#00FF00]/30"
          : draw
          ? "border-zinc-600/30"
          : "border-red-500/30"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-black ${
            win
              ? "bg-[#00FF00]/20 text-[#00FF00]"
              : draw
              ? "bg-zinc-700/40 text-zinc-300"
              : "bg-red-500/20 text-red-500"
          }`}
        >
          {win ? "V" : draw ? "E" : "D"}
        </span>
        <div className="flex-1">
          <p className="font-mono text-base font-bold tabular-nums text-zinc-100">
            {myScore} <span className="text-zinc-600">x</span> {oppScore}
          </p>
          <p className="text-[11px] text-zinc-500">{formatDate(m.date)}</p>
        </div>
        <div className="flex items-center gap-3">
          {me && me.goals > 0 && (
            <span className="flex items-center gap-1 text-xs font-bold tabular-nums text-amber-400">
              ⚽ {me.goals}
            </span>
          )}
          {me && me.assists > 0 && (
            <span className="flex items-center gap-1 text-xs font-bold tabular-nums text-sky-400">
              👟 {me.assists}
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && (
        <div className="grid grid-cols-1 gap-5 border-t border-white/5 bg-zinc-950/40 px-4 py-4 md:grid-cols-2">
          <TeamColumn team={m.teamA} myKey={key} colorClass="text-[#00FF00]" />
          <TeamColumn team={m.teamB} myKey={key} colorClass="text-red-500" />
        </div>
      )}
    </div>
  );
}

function TeamColumn({
  team,
  myKey,
  colorClass,
}: {
  team: { label: string; players: { id: string; name: string; goals: number; assists: number }[] };
  myKey: string;
  colorClass: string;
}) {
  return (
    <div>
      <div className={`mb-3 flex items-center gap-2 ${colorClass}`}>
        <Trophy className="h-4 w-4" />
        <h4 className="text-sm font-semibold tracking-wide">{team.label}</h4>
      </div>
      <ul className="space-y-1.5">
        {team.players.map((p) => {
          const isMe = p.name.trim().toLowerCase() === myKey;
          return (
            <li
              key={p.id}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                isMe
                  ? "border-[#00FF00]/60 bg-[#00FF00]/10 shadow-[0_0_15px_-5px_rgba(0,255,0,0.5)]"
                  : "border-white/5 bg-zinc-900/60"
              }`}
            >
              <span className={isMe ? "font-bold text-[#00FF00]" : "text-zinc-200"}>
                {p.name}
                {isMe && <span className="ml-1 text-[10px] uppercase opacity-70">(Você)</span>}
              </span>
              <span className="flex items-center gap-2 text-xs font-bold tabular-nums">
                {p.goals > 0 && <span className="text-amber-400">{p.goals}G</span>}
                {p.assists > 0 && <span className="text-sky-400">{p.assists}A</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}