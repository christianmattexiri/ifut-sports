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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
});

type HistPlayer = { id: string; name: string; goals: number; assists: number };
type HistTeam = { label: string; players: HistPlayer[] };
export type HistMatch = {
  id: string;
  date: string; // yyyy-mm-dd
  name: string;
  teamA: HistTeam;
  teamB: HistTeam;
  mvp: string | null; // player id
  topScorers: string[]; // ids
  topAssists: string[]; // ids
};

type Match = {
  id: string;
  name: string;
  logo_url: string | null;
  admin_id?: string | null;
};

const storageKey = (id: string) => `pelada:${id}:historico`;

function loadHistory(id: string): HistMatch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(id));
    return raw ? (JSON.parse(raw) as HistMatch[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(id: string, list: HistMatch[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(id), JSON.stringify(list));
}

function teamScore(t: HistTeam) {
  return t.players.reduce((a, p) => a + (Number(p.goals) || 0), 0);
}

function formatDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function HistoricoPage() {
  const navigate = useNavigate();
  const { id } = useParams({ from: "/pelada/$id_/historico" });
  const [match, setMatch] = useState<Match | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [history, setHistory] = useState<HistMatch[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<HistMatch | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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
      const { data: m } = await supabase
        .from("matches")
        .select("id, name, logo_url, admin_id")
        .eq("id", id)
        .maybeSingle();
      const mm = m as Match | null;
      setMatch(mm);
      setIsAdmin((mm?.admin_id ?? null) === uid);
    })();
  }, [navigate, id]);

  function persist(next: HistMatch[]) {
    // Sort newest first by date
    const sorted = [...next].sort((a, b) => (a.date < b.date ? 1 : -1));
    setHistory(sorted);
    saveHistory(id, sorted);
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
        players: a.map((p) => ({ ...p, goals: 0, assists: 0 })),
      },
      teamB: {
        label: "Time Branco",
        players: b.map((p) => ({ ...p, goals: 0, assists: 0 })),
      },
      mvp: null,
      topScorers: [],
      topAssists: [],
    };
    persist([newMatch, ...history]);
    setEditing(newMatch);
  }

  function handleDelete(matchId: string) {
    const next = history.filter((h) => h.id !== matchId);
    persist(next);
    setConfirmDelete(null);
    toast.success("Partida excluída.");
    // TODO: Persistir no Supabase (DELETE FROM matches WHERE id=...)
  }

  function handleSaveEdit(updated: HistMatch) {
    const next = history.map((h) => (h.id === updated.id ? updated : h));
    persist(next);
    setEditing(null);
    toast.success("Partida salva com sucesso!");
    // TODO: Persistir no Supabase e atualizar tabela de Rankings/Profiles
  }

  const peladaName = match?.name ?? "Minha Pelada";
  const peladaLogo = match?.logo_url ?? null;

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
            <NavItem icon={<HistoryIcon className="h-4 w-4" />} label="Histórico" active />
            <NavItem icon={<BarChart3 className="h-4 w-4" />} label="Rankings" />
            <NavItem icon={<UserCircle2 className="h-4 w-4" />} label="Meu perfil na pelada" />
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
        </aside>

        <section className="flex-1 px-5 py-8 md:px-10 md:py-10">
          <div className="mb-8 flex items-center justify-between gap-4">
            <h1 className="text-center text-2xl font-bold uppercase tracking-[0.3em] text-[#00FF00] drop-shadow-[0_0_15px_rgba(0,255,0,0.6)] md:text-3xl flex-1">
              Histórico de Jogos
            </h1>
            {isAdmin && (
              <button
                type="button"
                onClick={handleNewMatch}
                className="inline-flex items-center gap-2 rounded-xl border border-[#00FF00]/40 bg-[#00FF00]/10 px-4 py-2 text-sm font-bold uppercase tracking-wider text-[#00FF00] transition hover:bg-[#00FF00]/20 hover:shadow-[0_0_20px_-5px_rgba(0,255,0,0.6)]"
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
              className="bg-red-600 text-white hover:bg-red-500"
            >
              Excluir
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
  onEdit,
  onDelete,
}: {
  m: HistMatch;
  open: boolean;
  onToggle: () => void;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const sa = teamScore(m.teamA);
  const sb = teamScore(m.teamB);
  const aWin = sa > sb;
  const bWin = sb > sa;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl transition hover:border-white/20">
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-4 text-left"
        >
          <span className="text-xs tabular-nums text-zinc-500">{formatDate(m.date)}</span>
          <span className="text-sm font-medium text-zinc-200">{m.name}</span>
        </button>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 font-mono text-base font-bold tabular-nums">
            <span className={aWin ? "text-[#00FF00] drop-shadow-[0_0_8px_rgba(0,255,0,0.7)]" : "text-zinc-400"}>
              {sa}
            </span>
            <span className="text-zinc-600">x</span>
            <span className={bWin ? "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]" : "text-zinc-400"}>
              {sb}
            </span>
          </span>
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="rounded-lg p-1.5 text-amber-400 transition hover:bg-amber-400/10"
                aria-label="Editar"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-500/10"
                aria-label="Excluir"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/5"
            aria-label={open ? "Recolher" : "Expandir"}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {open && (
        <div className="grid grid-cols-1 gap-5 border-t border-white/5 bg-zinc-950/40 px-5 py-5 md:grid-cols-2">
          <TeamColumn team={m.teamA} winner={aWin} colorClass="text-[#00FF00]" Icon={Trophy} />
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

function EditMatchDialog({
  match,
  onClose,
  onSave,
}: {
  match: HistMatch;
  onClose: () => void;
  onSave: (m: HistMatch) => void;
}) {
  const [draft, setDraft] = useState<HistMatch>(match);

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
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto border-white/10 bg-zinc-950 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-[#00FF00]">Editar Partida</DialogTitle>
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

          {/* Stats */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
              Estatísticas Individuais
            </h3>
            <div className="space-y-5">
              {(["teamA", "teamB"] as const).map((tk) => {
                const t = draft[tk];
                const Color = tk === "teamA" ? Trophy : Skull;
                const colorClass = tk === "teamA" ? "text-[#00FF00]" : "text-red-500";
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
                          className="flex items-center justify-between rounded-lg border border-white/5 bg-zinc-900/60 px-3 py-2"
                        >
                          <span className="text-sm text-zinc-200">{p.name}</span>
                          <div className="flex items-center gap-3">
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
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-[#00FF00]/40 focus:outline-none"
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5"
          >
            <X className="h-4 w-4" />
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#00FF00]/50 bg-[#00FF00]/15 px-4 py-2 text-sm font-bold uppercase tracking-wider text-[#00FF00] transition hover:bg-[#00FF00]/25 hover:shadow-[0_0_20px_-5px_rgba(0,255,0,0.7)]"
          >
            <Save className="h-4 w-4" />
            Salvar
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
    <div className="flex items-center gap-1.5">
      <span className={`text-[11px] font-bold ${labelClass}`}>{label}:</span>
      <button
        type="button"
        onClick={() => onDelta(-1)}
        className="rounded border border-white/10 p-0.5 text-zinc-400 hover:bg-white/5"
        aria-label="Diminuir"
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-12 rounded border border-white/10 bg-zinc-900 px-1.5 py-0.5 text-center text-sm tabular-nums text-zinc-100 focus:border-[#00FF00]/40 focus:outline-none"
      />
      <button
        type="button"
        onClick={() => onDelta(1)}
        className="rounded border border-white/10 p-0.5 text-zinc-400 hover:bg-white/5"
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