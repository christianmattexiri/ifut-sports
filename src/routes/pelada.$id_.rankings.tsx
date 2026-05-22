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
  ArrowUp,
  ArrowDown,
  Minus,
  Crown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isSuperAdminUsername } from "@/lib/admin";
import { useQuery } from "@tanstack/react-query";
import { peladaMatchQuery, viewerQuery } from "@/lib/pelada-queries";
import { type HistMatch } from "./pelada.$id_.historico";
import { fetchAggregatedStats } from "@/lib/games-storage";
import { onProfileUpdate, onStatsUpdated } from "@/lib/profile-sync";
import { useAvatars } from "@/lib/avatars";
import { PlayerProfileModal } from "@/components/PlayerProfileModal";

export const Route = createFileRoute("/pelada/$id_/rankings")({
  component: RankingsPage,
  head: () => ({ meta: [{ title: "iFut — Rankings" }] }),
  loader: async ({ params, context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(peladaMatchQuery(params.id)),
      context.queryClient.ensureQueryData(viewerQuery()),
    ]);
  },
});

type Match = { id: string; name: string; logo_url: string | null; admin_id?: string | null };

type Stat = "gols" | "assistencias" | "mvps" | "vitorias" | "derrotas";

type PlayerStats = {
  id: string;
  name: string;
  avatar?: string | null;
  gols: number;
  assistencias: number;
  mvps: number;
  vitorias: number;
  derrotas: number;
  jogos: number;
};

const TABS: { key: Stat; label: string; emoji: string }[] = [
  { key: "gols", label: "Matadores", emoji: "⚽" },
  { key: "assistencias", label: "Maestros", emoji: "👟" },
  { key: "mvps", label: "MVP", emoji: "👑" },
  { key: "vitorias", label: "Vitórias", emoji: "🤝" },
  { key: "derrotas", label: "Lanternas", emoji: "💀" },
];

// Aggregation now happens server-side via fetchAggregatedStats.
// HistMatch is re-imported only to keep the module surface stable for now.
void ({} as HistMatch);

function RankingsPage() {
  const navigate = useNavigate();
  const { id } = useParams({ from: "/pelada/$id_/rankings" });
  const { data: matchData } = useQuery(peladaMatchQuery(id));
  const match = (matchData ?? null) as Match | null;
  const { data: viewer, isLoading: viewerLoading } = useQuery(viewerQuery());
  const isAdmin =
    !!viewer && !!match &&
    (match.admin_id === viewer.id || isSuperAdminUsername(viewer.username));
  useEffect(() => {
    if (!viewerLoading && viewer === null) navigate({ to: "/" });
  }, [viewer, viewerLoading, navigate]);
  const [activeTab, setActiveTab] = useState<Stat>("gols");
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [modalUser, setModalUser] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const rows = await fetchAggregatedStats(id);
      if (cancelled) return;
      setPlayers(rows as PlayerStats[]);
    };
    refresh();
    const off = onProfileUpdate(() => refresh());
    const offStats = onStatsUpdated(() => refresh());
    return () => { cancelled = true; off(); offStats(); };
  }, [id]);

  const ordered = useMemo(() => {
    return [...players].sort((a, b) => (b[activeTab] as number) - (a[activeTab] as number));
  }, [players, activeTab]);

  const podium = ordered.slice(0, 3);
  const rest = ordered.slice(3);
  const allIds = useMemo(() => ordered.map((p) => p.id), [ordered]);
  const avMap = useAvatars(allIds);
  const withAv = (p: PlayerStats): PlayerStats => ({
    ...p,
    avatar: p.avatar ?? avMap[p.id]?.avatar_url ?? null,
  });

  return (
    <main className="relative min-h-screen w-full bg-zinc-950 pt-14 text-zinc-100 font-sans antialiased pb-24">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 left-1/3 h-[480px] w-[480px] rounded-full bg-[var(--pelada-accent)]/10 blur-[160px]"
      />
      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 flex-col overflow-y-auto border-r border-white/5 bg-zinc-900/40 px-5 pt-5 pb-32 backdrop-blur-xl md:flex">
          <button
            onClick={() => navigate({ to: "/pelada/$id", params: { id } })}
            className="mb-7 inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-[var(--pelada-accent)]/40 hover:text-[var(--pelada-accent)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </button>
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl border border-[var(--pelada-accent)]/40 bg-zinc-900">
              {match?.logo_url ? (
                <img src={match.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Trophy className="h-5 w-5 text-[var(--pelada-accent)]" />
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Pelada</p>
              <p className="text-sm font-bold text-zinc-100">{match?.name ?? "—"}</p>
            </div>
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
            <NavItem icon={<BarChart3 className="h-4 w-4" />} label="Rankings" active />
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
                <button className="flex w-full items-center gap-2.5 rounded-xl border border-amber-400/30 bg-amber-400/5 px-3 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-400/10">
                  <ShieldCheck className="h-4 w-4" /> Administrador
                </button>
              </Link>
            )}
          </div>
          <div className="h-32 w-full shrink-0" aria-hidden />
        </aside>

        {/* Main */}
        <section className="flex-1 px-5 py-8 md:px-10 md:py-10">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-[var(--pelada-accent)]" />
            <h1 className="text-3xl font-black uppercase tracking-tight text-[var(--pelada-accent)] md:text-4xl">
              Ranking
            </h1>
          </div>
          <p className="mt-2 text-sm text-zinc-400">Quem manda e quem apanha na pelada.</p>

          {/* Tabs */}
          <div className="mt-6 flex flex-wrap gap-2">
            {TABS.map((t) => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                    active
                      ? "border-[var(--pelada-accent)] bg-[var(--pelada-accent)]/10 text-[var(--pelada-accent)] shadow-[0_0_25px_-5px_color-mix(in_oklab,var(--pelada-accent)_70%,transparent)]"
                      : "border-white/10 bg-zinc-900/60 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                  }`}
                >
                  <span className="mr-1.5">{t.emoji}</span>
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Podium */}
          <div className="mt-10 grid grid-cols-3 items-end gap-3 md:gap-6">
            <PodiumButton player={podium[1]} onPick={setModalUser}>
              <PodiumCard place={2} player={podium[1] && withAv(podium[1])} stat={activeTab} color="#9ca3af" label="2nd PLACE" size="sm" />
            </PodiumButton>
            <PodiumButton player={podium[0]} onPick={setModalUser}>
              <PodiumCard place={1} player={podium[0] && withAv(podium[0])} stat={activeTab} color="#fbbf24" label="1st PLACE" size="lg" />
            </PodiumButton>
            <PodiumButton player={podium[2]} onPick={setModalUser}>
              <PodiumCard place={3} player={podium[2] && withAv(podium[2])} stat={activeTab} color="#f97316" label="3rd PLACE" size="sm" />
            </PodiumButton>
          </div>

          {/* List */}
          <div className="mt-10 rounded-3xl border-2 border-[var(--pelada-accent)]/60 bg-zinc-950/80 p-2 shadow-[0_0_50px_-15px_color-mix(in_oklab,var(--pelada-accent)_50%,transparent)] md:p-3">
            <div className="rounded-2xl bg-zinc-900/40">
              {rest.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-500">
                  Apenas o top 3 disponível.
                </p>
              ) : (
                rest.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setModalUser({ id: p.id, name: p.name })}
                    className="block w-full text-left transition hover:bg-white/5"
                  >
                    <RankRow
                      position={idx + 4}
                      player={withAv(p)}
                      stat={activeTab}
                      last={idx === rest.length - 1}
                    />
                  </button>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
      <PlayerProfileModal
        open={!!modalUser}
        onOpenChange={(o) => !o && setModalUser(null)}
        matchId={id}
        userId={modalUser?.id ?? null}
        fallbackName={modalUser?.name}
      />
    </main>
  );
}

function PodiumCard({
  place,
  player,
  stat,
  color,
  label,
  size,
}: {
  place: number;
  player?: PlayerStats;
  stat: Stat;
  color: string;
  label: string;
  size: "sm" | "lg";
}) {
  const isLg = size === "lg";
  const value = player ? (player[stat] as number) : 0;
  return (
    <div
      className={`relative flex flex-col items-center rounded-3xl border-2 bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 text-center md:p-5 ${
        isLg ? "pt-10 md:pt-12" : "pt-6 md:pt-8"
      }`}
      style={{
        borderColor: color,
        boxShadow: `0 0 40px -10px ${color}99`,
      }}
    >
      {place === 1 && (
        <Crown
          className="absolute -top-5 h-9 w-9 drop-shadow-[0_0_10px_rgba(251,191,36,0.9)]"
          style={{ color }}
        />
      )}
      <div
        className={`grid place-items-center overflow-hidden rounded-full border-2 bg-zinc-800 ${
          isLg ? "h-24 w-24 md:h-28 md:w-28" : "h-16 w-16 md:h-20 md:w-20"
        }`}
        style={{ borderColor: color, boxShadow: `0 0 20px -4px ${color}` }}
      >
        {player?.avatar ? (
          <img src={player.avatar} alt={player.name} className="h-full w-full object-cover" />
        ) : (
          <span className={`font-black text-zinc-300 ${isLg ? "text-3xl" : "text-xl"}`}>
            {player?.name?.[0]?.toUpperCase() ?? "?"}
          </span>
        )}
      </div>
      <p
        className="mt-2 text-[10px] font-black uppercase tracking-[0.2em]"
        style={{ color }}
      >
        {label}
      </p>
      <p className={`mt-1 font-bold uppercase text-zinc-100 ${isLg ? "text-base md:text-lg" : "text-xs md:text-sm"}`}>
        {player?.name ?? "—"}
      </p>
      <p
        className={`mt-2 font-black tabular-nums ${isLg ? "text-5xl md:text-6xl" : "text-3xl md:text-4xl"}`}
        style={{ color, textShadow: `0 0 20px ${color}99` }}
      >
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">
        {statLabel(stat)}
      </p>
    </div>
  );
}

function PodiumButton({
  player,
  onPick,
  children,
}: {
  player?: PlayerStats;
  onPick: (p: { id: string; name: string }) => void;
  children: React.ReactNode;
}) {
  if (!player) return <>{children}</>;
  return (
    <button
      type="button"
      onClick={() => onPick({ id: player.id, name: player.name })}
      className="block w-full text-left transition hover:scale-[1.02]"
    >
      {children}
    </button>
  );
}

function RankRow({
  position,
  player,
  stat,
  last,
}: {
  position: number;
  player: PlayerStats;
  stat: Stat;
  last: boolean;
}) {
  // Mocked trend
  const trend = position % 3 === 0 ? "down" : position % 2 === 0 ? "up" : "flat";
  return (
    <div
      className={`flex items-center gap-3 px-3 py-3 md:gap-4 md:px-5 md:py-4 ${
        last ? "" : "border-b border-white/5"
      }`}
    >
      <span className="w-6 text-center text-sm font-black tabular-nums text-zinc-500">
        {position}
      </span>
      {trend === "up" ? (
        <ArrowUp className="h-4 w-4 text-[var(--pelada-accent)]" />
      ) : trend === "down" ? (
        <ArrowDown className="h-4 w-4 text-red-400" />
      ) : (
        <Minus className="h-4 w-4 text-zinc-500" />
      )}
      <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-white/10 bg-zinc-800 md:h-10 md:w-10">
        {player.avatar ? (
          <img src={player.avatar} alt={player.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-bold text-zinc-300">
            {player.name[0]?.toUpperCase()}
          </span>
        )}
      </div>
      <p className="flex-1 truncate text-sm font-semibold text-zinc-100 md:text-base">
        {player.name}
      </p>
      <p className="text-lg font-black tabular-nums text-[var(--pelada-accent)] drop-shadow-[0_0_8px_color-mix(in_oklab,var(--pelada-accent)_60%,transparent)] md:text-xl">
        {player[stat] as number}
      </p>
    </div>
  );
}

function statLabel(s: Stat) {
  switch (s) {
    case "gols":
      return "Gols";
    case "assistencias":
      return "Assistências";
    case "mvps":
      return "MVP";
    case "vitorias":
      return "Vitórias";
    case "derrotas":
      return "Derrotas";
  }
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
    <div
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-[var(--pelada-accent)]/10 text-[var(--pelada-accent)] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--pelada-accent)_25%,transparent)]"
          : gold
          ? "text-yellow-500 hover:bg-yellow-500/10"
          : "text-zinc-300 hover:bg-white/5 hover:text-zinc-100"
      }`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}