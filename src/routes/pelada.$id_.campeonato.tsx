import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft, Home, ClipboardList, History as HistoryIcon, BarChart3,
  UserCircle2, ShieldCheck, Trophy, UserCog, Award,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { peladaMatchQuery, viewerQuery } from "@/lib/pelada-queries";
import { peladaSettingsQuery, DEFAULT_SETTINGS } from "@/lib/pelada-settings";
import { fetchCampeonato, type CampeonatoRow } from "@/lib/games-storage";
import { isSuperAdminUsername } from "@/lib/admin";
import { useAvatars } from "@/lib/avatars";
import { PlayerProfileModal } from "@/components/PlayerProfileModal";
import { onStatsUpdated } from "@/lib/profile-sync";

export const Route = createFileRoute("/pelada/$id_/campeonato")({
  component: CampeonatoPage,
  head: () => ({ meta: [{ title: "iFut — Campeonato" }] }),
  loader: async ({ params, context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(peladaMatchQuery(params.id)),
      context.queryClient.ensureQueryData(viewerQuery()),
    ]);
  },
});

type Match = { id: string; name: string; logo_url: string | null; admin_id?: string | null };

function CampeonatoPage() {
  const navigate = useNavigate();
  const { id } = useParams({ from: "/pelada/$id_/campeonato" });
  const { data: matchData } = useQuery(peladaMatchQuery(id));
  const match = (matchData ?? null) as Match | null;
  const { data: viewer, isLoading: viewerLoading } = useQuery(viewerQuery());
  const { data: cloudSettings } = useQuery(peladaSettingsQuery(id));
  const settings = cloudSettings ?? DEFAULT_SETTINGS;
  const isAdmin =
    !!viewer && !!match &&
    (match.admin_id === viewer.id || isSuperAdminUsername(viewer.username));

  useEffect(() => {
    if (!viewerLoading && viewer === null) navigate({ to: "/" });
  }, [viewer, viewerLoading, navigate]);

  // Gate: módulo precisa estar ativo
  useEffect(() => {
    if (cloudSettings && !cloudSettings.modules.campeonato) {
      navigate({ to: "/pelada/$id", params: { id } });
    }
  }, [cloudSettings, navigate, id]);

  const [rows, setRows] = useState<CampeonatoRow[]>([]);
  const [modalUser, setModalUser] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const data = await fetchCampeonato(id);
      if (!cancelled) setRows(data);
    };
    refresh();
    const off = onStatsUpdated(() => refresh());
    return () => { cancelled = true; off(); };
  }, [id]);

  const allIds = rows.map((r) => r.id);
  const avMap = useAvatars(allIds);

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
            <Link to="/pelada/$id" params={{ id }} className="block"><NavItem icon={<Home className="h-4 w-4" />} label="Início" /></Link>
            <Link to="/pelada/$id/lista" params={{ id }} className="block"><NavItem icon={<ClipboardList className="h-4 w-4" />} label="Lista de Presença" /></Link>
            <Link to="/pelada/$id/partida" params={{ id }} className="block"><NavItem icon={<Trophy className="h-4 w-4" />} label="Partida" gold /></Link>
            <Link to="/pelada/$id/historico" params={{ id }} className="block"><NavItem icon={<HistoryIcon className="h-4 w-4" />} label="Histórico" /></Link>
            {settings.modules.rankings && (
              <Link to="/pelada/$id/rankings" params={{ id }} className="block"><NavItem icon={<BarChart3 className="h-4 w-4" />} label="Rankings" /></Link>
            )}
            <NavItem icon={<Award className="h-4 w-4" />} label="Campeonato" active />
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
        <section className="flex-1 px-4 py-8 md:px-10 md:py-10">
          <div className="flex items-center gap-3">
            <Award className="h-7 w-7 text-[var(--pelada-accent)]" />
            <h1 className="text-3xl font-black uppercase tracking-tight text-[var(--pelada-accent)] md:text-4xl">
              Campeonato
            </h1>
          </div>
          <p className="mt-2 text-sm text-zinc-400">
            Tabela estilo Brasileirão. Vitória = 3 pts · Empate = 1 pt · Derrota = 0.
          </p>

          {rows.length === 0 ? (
            <p className="mt-10 rounded-2xl border border-white/10 bg-zinc-900/40 p-10 text-center text-sm text-zinc-500">
              Sem partidas registradas ainda.
            </p>
          ) : (
            <div className="mt-8 overflow-hidden rounded-3xl border-2 border-[var(--pelada-accent)]/60 bg-zinc-950/80 shadow-[0_0_50px_-15px_color-mix(in_oklab,var(--pelada-accent)_50%,transparent)]">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-zinc-900/70 text-[10px] uppercase tracking-wider text-zinc-400">
                    <tr>
                      <th className="px-1 py-3 text-center sm:px-3">#</th>
                      <th className="px-1 py-3 text-left sm:px-3">Jogador</th>
                      <th className="px-1 py-3 text-center sm:px-3" title="Pontos">P</th>
                      <th className="px-1 py-3 text-center sm:px-3" title="Partidas">J</th>
                      <th className="px-1 py-3 text-center sm:px-3" title="Vitórias">V</th>
                      <th className="hidden px-1 py-3 text-center sm:table-cell sm:px-3" title="Empates">E</th>
                      <th className="hidden px-1 py-3 text-center sm:table-cell sm:px-3" title="Derrotas">D</th>
                      <th className="hidden px-1 py-3 text-center sm:table-cell sm:px-3" title="Gols Pró">GP</th>
                      <th className="hidden px-1 py-3 text-center sm:table-cell sm:px-3" title="% Presença">% Pres.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => {
                      const pos = idx + 1;
                      const av = avMap[r.id]?.avatar_url ?? null;
                      const shortName = formatShortName(r.name);
                      return (
                        <tr
                          key={r.id}
                          onClick={() => setModalUser({ id: r.id, name: r.name })}
                          className={`cursor-pointer border-t border-white/5 transition hover:bg-white/5 ${
                            pos === 1 ? "bg-[var(--pelada-accent)]/[0.06]" : ""
                          }`}
                        >
                          <td className="px-1 py-3 text-center sm:px-3">
                            <span
                              className={`inline-grid h-6 w-6 place-items-center rounded-md text-[11px] font-black tabular-nums ${
                                pos === 1
                                  ? "bg-amber-400/20 text-amber-300"
                                  : pos <= 3
                                  ? "bg-zinc-800 text-zinc-200"
                                  : "text-zinc-500"
                              }`}
                            >
                              {pos}
                            </span>
                          </td>
                          <td className="min-w-[100px] px-1 py-3 sm:px-3">
                            <div className="flex items-center gap-2 sm:gap-2.5">
                              <div className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-zinc-800 sm:h-8 sm:w-8">
                                {av ? (
                                  <img src={av} alt={r.name} className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-xs font-bold text-zinc-300">{r.name[0]?.toUpperCase()}</span>
                                )}
                              </div>
                              <span className="truncate font-semibold text-zinc-100">
                                <span className="sm:hidden">{shortName}</span>
                                <span className="hidden sm:inline">{r.name}</span>
                              </span>
                            </div>
                          </td>
                          <td className="px-1 py-3 text-center sm:px-3">
                            <span className="font-black tabular-nums text-[var(--pelada-accent)] drop-shadow-[0_0_6px_color-mix(in_oklab,var(--pelada-accent)_60%,transparent)]">
                              {r.pontos}
                            </span>
                          </td>
                          <td className="px-1 py-3 text-center font-semibold tabular-nums text-zinc-300 sm:px-3">{r.jogos}</td>
                          <td className="px-1 py-3 text-center font-semibold tabular-nums text-emerald-400 sm:px-3">{r.vitorias}</td>
                          <td className="hidden px-1 py-3 text-center font-semibold tabular-nums text-zinc-400 sm:table-cell sm:px-3">{r.empates}</td>
                          <td className="hidden px-1 py-3 text-center font-semibold tabular-nums text-red-400 sm:table-cell sm:px-3">{r.derrotas}</td>
                          <td className="hidden px-1 py-3 text-center font-semibold tabular-nums text-zinc-200 sm:table-cell sm:px-3">{r.golsPro}</td>
                          <td className="hidden px-1 py-3 text-center font-semibold tabular-nums text-zinc-300 sm:table-cell sm:px-3">{r.presencaPct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="mt-4 text-xs text-zinc-500">
            Critérios de desempate: 1º Vitórias · 2º Gols Pró.
          </p>
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

function NavItem({
  icon, label, active, gold,
}: {
  icon: React.ReactNode; label: string; active?: boolean; gold?: boolean;
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