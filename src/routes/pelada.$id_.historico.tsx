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
  Skull,
  Pencil,
  Trash2,
  ChevronDown,
  Plus,
  Save,
  X,
  UserCog,
  Crown,
  Target,
  Sparkles,
  Minus,
  Video,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { peladaMatchQuery, viewerQuery, matchRefereesQuery } from "@/lib/pelada-queries";
import {
  fetchHistory,
  saveMatch as saveGameMatch,
  deleteMatch as deleteGameMatch,
  type HistMatch as DbHistMatch,
} from "@/lib/games-storage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/pelada/$id_/historico")({
  component: HistoricoPage,
  head: () => ({ meta: [{ title: "iFut — Histórico de Jogos" }] }),
  loader: async ({ params, context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(peladaMatchQuery(params.id)),
      context.queryClient.ensureQueryData(viewerQuery()),
    ]);
  },
});

type HistPlayer = { id: string; name: string; goals: number; assists: number; own_goals: number };
type HistTeam = { label: string; players: HistPlayer[] };
export type HistMatch = {
  id: string;
  date: string; // yyyy-mm-dd
  name: string;
  teamA: HistTeam;
  teamB: HistTeam;
  mvp: string | null; // player id
  pereba?: string | null; // player id (winner of Pereba vote)
  topScorers: string[]; // ids
  topAssists: string[]; // ids
  videoUrl?: string | null;
};

type Match = {
  id: string;
  name: string;
  logo_url: string | null;
  admin_id?: string | null;
};

/**
 * Persistência agora é via Supabase (tabelas games + game_player_stats),
 * isoladas por match_id (id da pelada). Estes helpers mantêm uma assinatura
 * compatível para os consumidores que ainda lêem dados em useEffect.
 */
export async function loadHistoryAsync(
  peladaId: string,
  peladaName = "Pelada",
): Promise<HistMatch[]> {
  const list = await fetchHistory(peladaId, peladaName);
  return list as HistMatch[];
}

export async function saveMatchToDb(
  peladaId: string,
  m: HistMatch,
  opts?: { votingOpen?: boolean },
): Promise<void> {
  await saveGameMatch(peladaId, m as DbHistMatch, opts);
}

export async function deleteMatchFromDb(gameId: string): Promise<void> {
  await deleteGameMatch(gameId);
}

function teamScore(t: HistTeam, opponent?: HistTeam) {
  const own = t.players.reduce((a, p) => a + (Number(p.goals) || 0), 0);
  const oppOG = opponent
    ? opponent.players.reduce((a, p) => a + (Number(p.own_goals) || 0), 0)
    : 0;
  return own + oppOG;
}

function formatDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function HistoricoPage() {
  const navigate = useNavigate();
  const { id } = useParams({ from: "/pelada/$id_/historico" });
  const { data: matchData } = useQuery(peladaMatchQuery(id));
  const match = (matchData ?? null) as Match | null;
  const { data: viewer, isLoading: viewerLoading } = useQuery(viewerQuery());
  const isAdmin = !!viewer && !!match && match.admin_id === viewer.id;
  const { data: refereesData } = useQuery(matchRefereesQuery(id));
  const isReferee =
    !!viewer && (refereesData ?? []).some((r) => r.user_id === viewer.id);
  const canEdit = isAdmin || isReferee;
  useEffect(() => {
    if (!viewerLoading && viewer === null) navigate({ to: "/" });
  }, [viewer, viewerLoading, navigate]);
  const [history, setHistory] = useState<HistMatch[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<HistMatch | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loadingHist, setLoadingHist] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingHist(true);
    loadHistoryAsync(id, match?.name ?? "Pelada").then((list) => {
      if (cancelled) return;
      setHistory(list);
      setLoadingHist(false);
    });
    return () => { cancelled = true; };
  }, [id, match?.name]);

  async function reload() {
    const list = await loadHistoryAsync(id, match?.name ?? "Pelada");
    setHistory(list);
  }

  function handleNewMatch() {
    // Seed teams from current presence list (line + gks)
    let players: { id: string; name: string }[] = [];
    try {
      const raw = localStorage.getItem(`pelada:${id}:players`);
      if (raw) {
        const arr = JSON.parse(raw) as { id: string; name: string }[];
        players = arr.map((p) => ({ id: p.id, name: p.name }));
      }
    } catch {
      /* ignore */
    }
    const half = Math.ceil(players.length / 2);
    const a = players.slice(0, half);
    const b = players.slice(half);
    const today = new Date().toISOString().slice(0, 10);
    const newMatch: HistMatch = {
      id: crypto.randomUUID(),
      date: today,
      name: `${match?.name ?? "iFut"} ${formatDate(today)}`,
      teamA: {
        label: "Time Preto",
        players: a.map((p) => ({ ...p, goals: 0, assists: 0, own_goals: 0 })),
      },
      teamB: {
        label: "Time Branco",
        players: b.map((p) => ({ ...p, goals: 0, assists: 0, own_goals: 0 })),
      },
      mvp: null,
      topScorers: [],
      topAssists: [],
    };
    setEditing(newMatch);
  }

  async function handleDelete(gameId: string) {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteMatchFromDb(gameId);
      await reload();
      setConfirmDelete(null);
      toast.success("Partida excluída.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir: Verifique os dados");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSaveEdit(updated: HistMatch) {
    try {
      await saveMatchToDb(id, updated);
      await reload();
      setEditing(null);
      toast.success("Partida salva no servidor!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar";
      toast.error(msg);
    }
  }

  const peladaName = match?.name ?? "Minha Pelada";
  const peladaLogo = match?.logo_url ?? null;

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-zinc-950 pt-14 text-zinc-100 font-sans antialiased pb-24">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 left-1/3 h-[480px] w-[480px] rounded-full bg-[var(--pelada-accent)]/10 blur-[160px]"
      />
      <div className="relative z-10 flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 flex-col overflow-y-auto border-r border-white/5 bg-zinc-900/40 px-5 pt-5 pb-32 backdrop-blur-xl md:flex">
          <button
            type="button"
            onClick={() => navigate({ to: "/pelada/$id", params: { id } })}
            className="mb-5 inline-flex items-center gap-1.5 self-start rounded-lg px-2 py-1 text-xs font-medium text-zinc-400 transition hover:text-[var(--pelada-accent)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar à Pelada
          </button>

          <div className="flex flex-col items-center gap-2 pb-6">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[var(--pelada-accent)]/40 bg-zinc-900 shadow-[0_0_30px_-8px_color-mix(in_oklab,var(--pelada-accent)_70%,transparent)]">
              {peladaLogo ? (
                <img src={peladaLogo} alt={peladaName} className="h-full w-full object-cover" />
              ) : (
                <Trophy className="h-9 w-9 text-[var(--pelada-accent)]" />
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
            <NavItem icon={<HistoryIcon className="h-4 w-4" />} label="Histórico" active />
            <Link to="/pelada/$id/rankings" params={{ id }} className="block"><NavItem icon={<BarChart3 className="h-4 w-4" />} label="Rankings" /></Link>
            <Link to="/pelada/$id/perfil" params={{ id }} className="block"><NavItem icon={<UserCircle2 className="h-4 w-4" />} label="Meu perfil na pelada" /></Link>
          </nav>

          <div className="mt-auto pt-6">
            {isAdmin && (
              <Link to="/pelada/$id/usuarios" params={{ id }} className="mb-2 block">
                <NavItem icon={<UserCog className="h-4 w-4" />} label="Gerenciamento de Usuários" />
              </Link>
            )}
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-xl border border-amber-400/30 bg-amber-400/5 px-3 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-400/10"
            >
              <ShieldCheck className="h-4 w-4" />
              Administrador
            </button>
          </div>
          <div className="h-32 w-full shrink-0" aria-hidden />
        </aside>

        <section className="flex-1 px-5 py-8 md:px-10 md:py-10">
          <div className="mb-8 flex items-center justify-between gap-4">
            <h1 className="text-center text-2xl font-bold uppercase tracking-[0.3em] text-[var(--pelada-accent)] drop-shadow-[0_0_15px_color-mix(in_oklab,var(--pelada-accent)_60%,transparent)] md:text-3xl flex-1">
              Histórico de Jogos
            </h1>
            {canEdit && (
              <button
                type="button"
                onClick={handleNewMatch}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--pelada-accent)]/40 bg-[var(--pelada-accent)]/10 px-4 py-2 text-sm font-bold uppercase tracking-wider text-[var(--pelada-accent)] transition hover:bg-[var(--pelada-accent)]/20 hover:shadow-[0_0_20px_-5px_color-mix(in_oklab,var(--pelada-accent)_60%,transparent)]"
              >
                <Plus className="h-4 w-4" />
                Nova Partida
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/30 px-6 py-16 text-center">
              <Trophy className="mx-auto h-10 w-10 text-zinc-700" />
              <p className="mt-4 text-sm text-zinc-400">
                Nenhuma partida registrada ainda. Jogue sua primeira pelada para ver o histórico!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((h) => (
                <MatchAccordion
                  key={h.id}
                  m={h}
                  open={openId === h.id}
                  onToggle={() => setOpenId(openId === h.id ? null : h.id)}
                  isAdmin={isAdmin}
                  canEdit={canEdit}
                  onEdit={() => setEditing(h)}
                  onDelete={() => setConfirmDelete(h.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {editing && (
        <EditMatchDialog
          match={editing}
          onClose={() => setEditing(null)}
          onSave={handleSaveEdit}
        />
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent className="border-red-500/30 bg-zinc-900 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir partida?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Esta ação não pode ser desfeita. A partida será removida do histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent text-zinc-300 hover:bg-white/5">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-500"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function MatchAccordion({
  m,
  open,
  onToggle,
  isAdmin,
  canEdit,
  onEdit,
  onDelete,
}: {
  m: HistMatch;
  open: boolean;
  onToggle: () => void;
  isAdmin: boolean;
  canEdit?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const sa = teamScore(m.teamA);
  const sb = teamScore(m.teamB);
  const aWin = sa > sb;
  const bWin = sb > sa;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl transition hover:border-white/20">
      <div className="flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-5 sm:py-4">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2 text-left sm:gap-4"
        >
          <span className="shrink-0 text-[11px] tabular-nums text-zinc-500 sm:text-xs">{formatDate(m.date)}</span>
          <span className="truncate text-xs font-medium text-zinc-200 sm:text-sm">{m.name}</span>
        </button>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          {m.videoUrl && (
            <a
              href={m.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg p-1 text-red-500 transition hover:bg-red-500/10 sm:p-1.5"
              aria-label="Assistir vídeo da partida"
              title="Assistir vídeo da partida"
            >
              <Video className="h-4 w-4" />
            </a>
          )}
          <span className="flex items-center gap-1.5 font-mono text-sm font-bold tabular-nums sm:gap-2 sm:text-base">
            <span className={aWin ? "text-[var(--pelada-accent)] drop-shadow-[0_0_8px_color-mix(in_oklab,var(--pelada-accent)_70%,transparent)]" : "text-zinc-400"}>
              {sa}
            </span>
            <span className="text-zinc-600">x</span>
            <span className={bWin ? "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]" : "text-zinc-400"}>
              {sb}
            </span>
          </span>
          {(canEdit ?? isAdmin) && (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="rounded-lg p-1 text-amber-400 transition hover:bg-amber-400/10 sm:p-1.5"
                aria-label="Editar"
              >
                <Pencil className="h-4 w-4" />
              </button>
              {isAdmin && <button
                type="button"
                onClick={onDelete}
                className="rounded-lg p-1 text-red-500 transition hover:bg-red-500/10 sm:p-1.5"
                aria-label="Excluir"
              >
                <Trash2 className="h-4 w-4" />
              </button>}
            </>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg p-1 text-zinc-400 transition hover:bg-white/5 sm:p-1.5"
            aria-label={open ? "Recolher" : "Expandir"}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {open && (
        <div className="grid grid-cols-1 gap-5 border-t border-white/5 bg-zinc-950/40 px-5 py-5 md:grid-cols-2">
          <TeamColumn team={m.teamA} winner={aWin} colorClass="text-[var(--pelada-accent)]" Icon={Trophy} />
          <TeamColumn team={m.teamB} winner={bWin} colorClass="text-red-500" Icon={bWin ? Trophy : Skull} />
        </div>
      )}
    </div>
  );
}

function TeamColumn({
  team,
  winner,
  colorClass,
  Icon,
}: {
  team: HistTeam;
  winner: boolean;
  colorClass: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div>
      <div className={`mb-3 flex items-center gap-2 ${colorClass}`}>
        <Icon className="h-4 w-4" />
        <h3 className="text-sm font-semibold tracking-wide">
          {team.label}
          {winner && <span className="ml-1 text-xs opacity-70">(Vitória)</span>}
        </h3>
      </div>
      <ul className="space-y-1.5">
        {team.players.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-lg border border-white/5 bg-zinc-900/60 px-3 py-2 text-sm"
          >
            <span className="text-zinc-200">{p.name}</span>
            <span className="flex items-center gap-2 text-xs font-bold tabular-nums">
              {p.goals > 0 && <span className="text-amber-400">{p.goals}G</span>}
              {p.assists > 0 && <span className="text-sky-400">{p.assists}A</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EditMatchDialog({
  match,
  onClose,
  onSave,
}: {
  match: HistMatch;
  onClose: () => void;
  onSave: (m: HistMatch) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<HistMatch>(match);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSave(draft);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar: Verifique os dados");
    } finally {
      setIsSaving(false);
    }
  }

  const allPlayers = useMemo(
    () => [...draft.teamA.players, ...draft.teamB.players],
    [draft.teamA.players, draft.teamB.players],
  );

  function updatePlayer(
    teamKey: "teamA" | "teamB",
    playerId: string,
    field: "goals" | "assists",
    delta: number,
  ) {
    setDraft((d) => ({
      ...d,
      [teamKey]: {
        ...d[teamKey],
        players: d[teamKey].players.map((p) =>
          p.id === playerId ? { ...p, [field]: Math.max(0, p[field] + delta) } : p,
        ),
      },
    }));
  }

  function setPlayerValue(
    teamKey: "teamA" | "teamB",
    playerId: string,
    field: "goals" | "assists",
    value: number,
  ) {
    setDraft((d) => ({
      ...d,
      [teamKey]: {
        ...d[teamKey],
        players: d[teamKey].players.map((p) =>
          p.id === playerId ? { ...p, [field]: Math.max(0, value) } : p,
        ),
      },
    }));
  }

  // Sorted leaderboards
  const scorers = useMemo(
    () => [...allPlayers].sort((a, b) => b.goals - a.goals),
    [allPlayers],
  );
  const assisters = useMemo(
    () => [...allPlayers].sort((a, b) => b.assists - a.assists),
    [allPlayers],
  );

  function autoTopScorers() {
    const top = scorers[0]?.goals ?? 0;
    if (top <= 0) return setDraft((d) => ({ ...d, topScorers: [] }));
    setDraft((d) => ({ ...d, topScorers: scorers.filter((p) => p.goals === top).map((p) => p.id) }));
  }
  function autoTopAssists() {
    const top = assisters[0]?.assists ?? 0;
    if (top <= 0) return setDraft((d) => ({ ...d, topAssists: [] }));
    setDraft((d) => ({
      ...d,
      topAssists: assisters.filter((p) => p.assists === top).map((p) => p.id),
    }));
  }

  function toggle(field: "topScorers" | "topAssists", playerId: string) {
    setDraft((d) => {
      const set = new Set(d[field]);
      if (set.has(playerId)) set.delete(playerId);
      else set.add(playerId);
      return { ...d, [field]: Array.from(set) };
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-4xl overflow-x-hidden overflow-y-auto border-white/10 bg-zinc-950 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-[var(--pelada-accent)]">Editar Partida</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header info */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs">
              <span className="mb-1 block text-zinc-400">Data</span>
              <Input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                className="border-white/10 bg-zinc-900"
              />
            </label>
            <label className="text-xs">
              <span className="mb-1 block text-zinc-400">Nome</span>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="border-white/10 bg-zinc-900"
              />
            </label>
          </div>

          <label className="block text-xs">
            <span className="mb-1 block text-zinc-400">
              Vídeo da partida <span className="text-zinc-500">(Opcional)</span>
            </span>
            <Input
              type="url"
              inputMode="url"
              placeholder="https://youtube.com/..."
              value={draft.videoUrl ?? ""}
              onChange={(e) => setDraft({ ...draft, videoUrl: e.target.value })}
              className="border-white/10 bg-zinc-900"
            />
          </label>

          {/* Stats */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
              Estatísticas Individuais
            </h3>
            <div className="space-y-5">
              {(["teamA", "teamB"] as const).map((tk) => {
                const t = draft[tk];
                const Color = tk === "teamA" ? Trophy : Skull;
                const colorClass = tk === "teamA" ? "text-[var(--pelada-accent)]" : "text-red-500";
                return (
                  <div key={tk}>
                    <div className={`mb-2 flex items-center gap-2 ${colorClass}`}>
                      <Color className="h-4 w-4" />
                      <h4 className="text-sm font-bold uppercase tracking-wider">{t.label}</h4>
                    </div>
                    <ul className="space-y-1.5">
                       {t.players.map((p) => (
                        <li
                          key={p.id}
                          className="flex flex-wrap items-center justify-between gap-1 rounded-lg border border-white/5 bg-zinc-900/60 p-2 sm:flex-nowrap sm:gap-3 sm:px-3"
                        >
                          <span className="min-w-[80px] flex-1 truncate text-sm text-zinc-200">{p.name}</span>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <StatStepper
                              label="G"
                              labelClass="text-amber-400"
                              value={p.goals}
                              onChange={(v) => setPlayerValue(tk, p.id, "goals", v)}
                              onDelta={(d) => updatePlayer(tk, p.id, "goals", d)}
                            />
                            <StatStepper
                              label="A"
                              labelClass="text-sky-400"
                              value={p.assists}
                              onChange={(v) => setPlayerValue(tk, p.id, "assists", v)}
                              onDelta={(d) => updatePlayer(tk, p.id, "assists", d)}
                            />
                          </div>
                        </li>
                      ))}
                      {t.players.length === 0 && (
                        <li className="rounded-lg border border-dashed border-white/5 px-3 py-3 text-center text-xs text-zinc-500">
                          Sem jogadores
                        </li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MVP */}
          <div>
            <div className="mb-2 flex items-center gap-2 text-amber-400">
              <Crown className="h-4 w-4" />
              <h4 className="text-sm font-bold uppercase tracking-wider">MVP — Craque do Jogo</h4>
            </div>
            <select
              value={draft.mvp ?? ""}
              onChange={(e) => setDraft({ ...draft, mvp: e.target.value || null })}
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-[var(--pelada-accent)]/40 focus:outline-none"
            >
              <option value="">Selecione um jogador...</option>
              {allPlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Top Scorers */}
          <PodiumSelector
            title="Matador (Artilheiros)"
            Icon={Target}
            colorClass="text-amber-400"
            field="goals"
            players={scorers}
            selectedIds={draft.topScorers}
            onToggle={(pid) => toggle("topScorers", pid)}
            onAuto={autoTopScorers}
            onClear={() => setDraft({ ...draft, topScorers: [] })}
          />

          {/* Top Assists */}
          <PodiumSelector
            title="Maestro (Assistências)"
            Icon={Sparkles}
            colorClass="text-sky-400"
            field="assists"
            players={assisters}
            selectedIds={draft.topAssists}
            onToggle={(pid) => toggle("topAssists", pid)}
            onAuto={autoTopAssists}
            onClear={() => setDraft({ ...draft, topAssists: [] })}
          />
        </div>

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5"
          >
            <X className="h-4 w-4" />
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--pelada-accent)]/50 bg-[var(--pelada-accent)]/15 px-4 py-2 text-sm font-bold uppercase tracking-wider text-[var(--pelada-accent)] transition hover:bg-[var(--pelada-accent)]/25 hover:shadow-[0_0_20px_-5px_color-mix(in_oklab,var(--pelada-accent)_70%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatStepper({
  label,
  labelClass,
  value,
  onChange,
  onDelta,
}: {
  label: string;
  labelClass: string;
  value: number;
  onChange: (v: number) => void;
  onDelta: (d: number) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
      <span className={`text-[11px] font-bold ${labelClass}`}>{label}:</span>
      <button
        type="button"
        onClick={() => onDelta(-1)}
        className="rounded border border-white/10 p-0.5 text-zinc-400 hover:bg-white/5 sm:p-1"
        aria-label="Diminuir"
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={value === 0 ? "" : value}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return onChange(0);
          const n = Number(raw);
          if (Number.isFinite(n) && n >= 0) onChange(n);
        }}
        placeholder="0"
        className="w-9 appearance-none rounded border border-white/10 bg-zinc-900 px-1 py-0.5 text-center text-sm tabular-nums text-zinc-100 placeholder:text-zinc-600 focus:border-[var(--pelada-accent)]/40 focus:outline-none sm:w-12 sm:px-1.5 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
      />
      <button
        type="button"
        onClick={() => onDelta(1)}
        className="rounded border border-white/10 p-0.5 text-zinc-400 hover:bg-white/5 sm:p-1"
        aria-label="Aumentar"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

function PodiumSelector({
  title,
  Icon,
  colorClass,
  field,
  players,
  selectedIds,
  onToggle,
  onAuto,
  onClear,
}: {
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  field: "goals" | "assists";
  players: HistPlayer[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onAuto: () => void;
  onClear: () => void;
}) {
  const set = new Set(selectedIds);
  const podiumNames = players.filter((p) => set.has(p.id)).map((p) => p.name);
  return (
    <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex items-center gap-2 ${colorClass}`}>
          <Icon className="h-4 w-4" />
          <h4 className="text-sm font-bold uppercase tracking-wider">{title}</h4>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <button
            type="button"
            onClick={onAuto}
            className="font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300"
          >
            Auto
          </button>
          <button
            type="button"
            onClick={onClear}
            className="font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
          >
            Limpar
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
        {players.map((p) => {
          const isSel = set.has(p.id);
          const v = p[field];
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p.id)}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                isSel
                  ? "border-amber-400/60 bg-amber-400/10 text-amber-300 shadow-[0_0_12px_-4px_rgba(251,191,36,0.6)]"
                  : "border-white/5 bg-zinc-900/60 text-zinc-300 hover:bg-white/5"
              }`}
            >
              <span>{p.name}</span>
              <span className="text-xs font-bold tabular-nums">{v}</span>
            </button>
          );
        })}
        {players.length === 0 && (
          <p className="col-span-full text-center text-xs text-zinc-500">Sem jogadores</p>
        )}
      </div>
      {podiumNames.length > 0 && (
        <p className="mt-3 text-xs text-zinc-500">
          Pódio: <span className="text-zinc-300">{podiumNames.join(", ")}</span>
        </p>
      )}
    </div>
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