import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Home, ClipboardList, History, BarChart3, UserCircle2,
  ShieldCheck, Trophy, UserCog, Save, RefreshCw, ClipboardCopy,
  MousePointerClick, Scale, Dices, Radio, OctagonAlert,
} from "lucide-react";
import { isSuperAdminUsername } from "@/lib/admin";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { peladaMatchQuery, viewerQuery, matchAttendanceQuery } from "@/lib/pelada-queries";
import { matchRefereesQuery } from "@/lib/pelada-queries";
import { peladaSettingsQuery, DEFAULT_SETTINGS } from "@/lib/pelada-settings";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { EditMatchDialog, saveMatchToDb, type HistMatch } from "./pelada.$id_.historico";
import { saveCurrentDraw, incrementPlayerStat } from "@/lib/games-storage";

export const Route = createFileRoute("/pelada/$id_/partida")({
  component: PartidaPage,
  head: () => ({ meta: [{ title: "iFut — Partida" }] }),
  loader: async ({ params, context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(peladaMatchQuery(params.id)),
      context.queryClient.ensureQueryData(viewerQuery()),
    ]);
    context.queryClient.prefetchQuery(matchAttendanceQuery(params.id));
  },
});

type Match = { id: string; name: string; logo_url: string | null; admin_id?: string | null; current_draw?: unknown | null };
type Player = { id: string; name: string; isGoalkeeper: boolean; rating?: number; userId?: string | null };
type SavedTeams = { teamA: Player[]; teamB: Player[] };

function PartidaPage() {
  const navigate = useNavigate();
  const { id } = useParams({ from: "/pelada/$id_/partida" });
  const queryClient = useQueryClient();
  const { data: matchData } = useQuery(peladaMatchQuery(id));
  const match = (matchData ?? null) as Match | null;
  const { data: viewer, isLoading: viewerLoading } = useQuery(viewerQuery());
  const { data: cloudSettings } = useQuery(peladaSettingsQuery(id));
  const settings = cloudSettings ?? DEFAULT_SETTINGS;
  const isAdmin =
    !!viewer && !!match &&
    (match.admin_id === viewer.id || isSuperAdminUsername(viewer.username));
  const refereesQuery = useQuery(matchRefereesQuery(id));
  const referees = refereesQuery.data ?? [];
  const isReferee = !!viewer && referees.some((r) => r.user_id === viewer.id);
  const canRegister = isAdmin || isReferee;
  const refereeUserIds = useMemo(
    () => new Set(referees.map((r) => r.user_id)),
    [referees],
  );
  useEffect(() => {
    if (!viewerLoading && viewer === null) navigate({ to: "/" });
  }, [viewer, viewerLoading, navigate]);
  const [saved, setSaved] = useState<SavedTeams | null>(null);
  const [sorteioOpen, setSorteioOpen] = useState(false);
  const [sepOpen, setSepOpen] = useState(false);
  const [sepMode, setSepMode] = useState<"manual" | "fair" | "random">("manual");
  const [teamA, setTeamA] = useState<Player[]>([]);
  const [teamB, setTeamB] = useState<Player[]>([]);
  const [pool, setPool] = useState<Player[]>([]);
  const [editing, setEditing] = useState<HistMatch | null>(null);
  const [liveMatch, setLiveMatch] = useState<HistMatch | null>(null);
  const [liveTarget, setLiveTarget] = useState<{ playerId: string; team: "A" | "B"; name: string } | null>(null);
  const liveMode = !!liveMatch;

  // Hydrate saved teams from matches.current_draw (DB persistence).
  useEffect(() => {
    const draw = (match?.current_draw ?? null) as SavedTeams | null;
    if (draw && Array.isArray(draw.teamA) && Array.isArray(draw.teamB) && draw.teamA.length > 0) {
      setSaved(draw);
    }
  }, [match?.current_draw]);

  // Lista de presença: query compartilhada (cacheada pelo loader pai).
  const attendanceQuery = useQuery(matchAttendanceQuery(id));

  const confirmed = useMemo<Player[]>(() => {
    const rows = attendanceQuery.data ?? [];
    return rows
      .filter((r) => !r.is_referee && !(r.player_id && refereeUserIds.has(r.player_id)))
      .map((r) => {
      const userId = (r.player_id as string | null) ?? null;
      const rowId = r.id as string;
      return {
        id: userId ?? rowId,
        name: (r.player_name as string) ?? "Jogador",
        isGoalkeeper: !!r.is_goalkeeper,
        rating: Number(r.rating ?? 5),
        userId,
      };
    });
  }, [attendanceQuery.data, refereeUserIds]);

  const enriched = confirmed;
  const isSorteioSalvo = !!saved && saved.teamA.length > 0;

  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function runSorteio(mode: "manual" | "fair" | "random") {
    const gks = enriched.filter((p) => p.isGoalkeeper);
    const line = enriched.filter((p) => !p.isGoalkeeper);
    const a: Player[] = [], b: Player[] = [], remaining: Player[] = [];
    const sg = shuffle(gks);
    if (sg[0]) a.push(sg[0]);
    if (sg[1]) b.push(sg[1]);
    for (let i = 2; i < sg.length; i++) remaining.push(sg[i]);

    if (mode === "manual") {
      remaining.push(...line);
    } else if (mode === "random") {
      const sh = shuffle(line);
      const half = Math.ceil(sh.length / 2);
      a.push(...sh.slice(0, half));
      b.push(...sh.slice(half));
    } else {
      const sorted = [...line].sort((x, y) => (y.rating ?? 5) - (x.rating ?? 5));
      const sum = (t: Player[]) => t.reduce((s, p) => s + (p.rating ?? 5), 0);
      for (const p of sorted) {
        if (sum(a.filter((x) => !x.isGoalkeeper)) <= sum(b.filter((x) => !x.isGoalkeeper))) a.push(p);
        else b.push(p);
      }
    }
    setTeamA(a); setTeamB(b); setPool(remaining);
  }

  function openSeparation(mode: "manual" | "fair" | "random") {
    if (enriched.length === 0) { toast.error("Nenhum jogador confirmado na lista"); return; }
    setSepMode(mode); runSorteio(mode); setSorteioOpen(false); setSepOpen(true);
  }

  function moveTo(pid: string, target: "A" | "B") {
    const p = pool.find((x) => x.id === pid) || teamA.find((x) => x.id === pid) || teamB.find((x) => x.id === pid);
    if (!p) return;
    setPool((s) => s.filter((x) => x.id !== pid));
    setTeamA((s) => s.filter((x) => x.id !== pid));
    setTeamB((s) => s.filter((x) => x.id !== pid));
    if (target === "A") setTeamA((s) => [...s, p]); else setTeamB((s) => [...s, p]);
  }

  function backToPool(pid: string) {
    const p = teamA.find((x) => x.id === pid) || teamB.find((x) => x.id === pid);
    if (!p) return;
    setTeamA((s) => s.filter((x) => x.id !== pid));
    setTeamB((s) => s.filter((x) => x.id !== pid));
    setPool((s) => [...s, p]);
  }

  async function saveTeams() {
    const data: SavedTeams = { teamA, teamB };
    setSaved(data);
    setSepOpen(false);
    try {
      await saveCurrentDraw(id, data);
      queryClient.invalidateQueries({ queryKey: ["pelada-match", id] });
      toast.success("Times salvos!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao persistir");
    }
  }

  async function copyTeams() {
    if (!saved) return;
    const lines = [
      `⚔️ TIMES DEFINIDOS - ${match?.name ?? "Pelada"} ⚔️`,
      ``,
      `👕 TIME A`,
      ...saved.teamA.map((p) => p.name),
      ``,
      `🎽 TIME B`,
      ...saved.teamB.map((p) => p.name),
      ``,
      `🔥 Que vença o melhor!`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Times copiados!");
    } catch { toast.error("Não foi possível copiar"); }
  }

  function startRegister() {
    if (!saved) return;
    const today = new Date().toISOString().slice(0, 10);
    const m: HistMatch = {
      id: crypto.randomUUID(),
      date: today,
      name: `${match?.name ?? "iFut"} ${today.split("-").reverse().join("/")}`,
      teamA: { label: "Time A", players: saved.teamA.map((p) => ({ id: p.id, name: p.name, goals: 0, assists: 0 })) },
      teamB: { label: "Time B", players: saved.teamB.map((p) => ({ id: p.id, name: p.name, goals: 0, assists: 0 })) },
      mvp: null, topScorers: [], topAssists: [],
    };
    setEditing(m);
  }

  async function startLive() {
    if (!saved) { toast.error("Sorteie e salve os times primeiro"); return; }
    const today = new Date().toISOString().slice(0, 10);
    const draft: HistMatch = {
      id: crypto.randomUUID(),
      date: today,
      name: `${match?.name ?? "iFut"} ${today.split("-").reverse().join("/")}`,
      teamA: { label: "Time A", players: saved.teamA.map((p) => ({ id: p.id, name: p.name, goals: 0, assists: 0 })) },
      teamB: { label: "Time B", players: saved.teamB.map((p) => ({ id: p.id, name: p.name, goals: 0, assists: 0 })) },
      mvp: null, topScorers: [], topAssists: [],
    };
    try {
      await saveMatchToDb(id, draft);
      setLiveMatch(draft);
      toast.success("Modo Ao Vivo iniciado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao iniciar");
    }
  }

  async function registerLiveStat(field: "goals" | "assists") {
    if (!liveMatch || !liveTarget) return;
    const { playerId, team, name } = liveTarget;
    setLiveTarget(null);
    // Optimistic local update.
    setLiveMatch((prev) => {
      if (!prev) return prev;
      const updateTeam = (t: HistMatch["teamA"]) => ({
        ...t,
        players: t.players.map((p) =>
          p.id === playerId ? { ...p, [field]: (p[field] || 0) + 1 } : p,
        ),
      });
      return team === "A"
        ? { ...prev, teamA: updateTeam(prev.teamA) }
        : { ...prev, teamB: updateTeam(prev.teamB) };
    });
    try {
      await incrementPlayerStat(liveMatch.id, playerId, field, 1);
      toast.success(`${field === "goals" ? "Gol" : "Assistência"} de ${name} salvo!`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    }
  }

  function finishLive() {
    if (!liveMatch) return;
    setEditing(liveMatch);
    setLiveMatch(null);
  }

  async function handleSaveMatch(updated: HistMatch) {
    try {
      // Abre a votação automaticamente se algum modo estiver ativo e o admin
      // não tiver escolhido vencedores manualmente. Evita o falso positivo
      // de auto-encerramento e destrava o Pódio.
      const voteOn =
        settings.modules.votacoes &&
        (settings.voteModes.mvp ||
          settings.voteModes.pereba ||
          settings.voteModes.apitto);
      const manualWinners = !!updated.mvp || !!updated.pereba;
      const votingOpen = !!voteOn && !manualWinners;
      await saveMatchToDb(id, updated, { votingOpen });
      // Força Pódio e telas iniciais a relerem o estado fresco do banco.
      queryClient.invalidateQueries({ queryKey: ["match-votes", updated.id] });
      queryClient.invalidateQueries();
      setEditing(null);
      toast.success("Partida registrada! Pódio atualizado.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao registrar";
      toast.error(msg);
    }
  }

  const peladaName = match?.name ?? "Minha Pelada";
  const peladaLogo = match?.logo_url ?? null;

  return (
    <main className="relative min-h-screen w-full bg-zinc-950 pt-14 text-zinc-100 font-sans antialiased pb-24">
      <div aria-hidden className="pointer-events-none fixed -top-40 left-1/3 h-[480px] w-[480px] rounded-full bg-[var(--pelada-accent)]/10 blur-[160px]" />
      <div className="relative z-10 flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 flex-col overflow-y-auto border-r border-white/5 bg-zinc-900/40 px-5 pt-5 pb-32 backdrop-blur-xl md:flex">
          <button type="button" onClick={() => navigate({ to: "/dashboard" })} className="mb-5 inline-flex items-center gap-1.5 self-start rounded-lg px-2 py-1 text-xs font-medium text-zinc-400 transition hover:text-[var(--pelada-accent)]">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Início do App
          </button>
          <div className="flex flex-col items-center gap-2 pb-6">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[var(--pelada-accent)]/40 bg-zinc-900 shadow-[0_0_30px_-8px_color-mix(in_oklab,var(--pelada-accent)_70%,transparent)]">
              {peladaLogo ? <img src={peladaLogo} alt={peladaName} className="h-full w-full object-cover" /> : <Trophy className="h-9 w-9 text-[var(--pelada-accent)]" />}
            </div>
            <p className="text-center text-base font-bold tracking-tight text-white">{peladaName}</p>
          </div>
          <nav className="space-y-1.5">
            <Link to="/pelada/$id" params={{ id }} className="block"><NavItem icon={<Home className="h-4 w-4" />} label="Início" /></Link>
            <Link to="/pelada/$id/lista" params={{ id }} className="block"><NavItem icon={<ClipboardList className="h-4 w-4" />} label="Lista de Presença" /></Link>
            <NavItem icon={<Trophy className="h-4 w-4" />} label="Partida" gold active />
            <Link to="/pelada/$id/historico" params={{ id }} className="block"><NavItem icon={<History className="h-4 w-4" />} label="Histórico" /></Link>
            <Link to="/pelada/$id/rankings" params={{ id }} className="block"><NavItem icon={<BarChart3 className="h-4 w-4" />} label="Rankings" /></Link>
            <Link to="/pelada/$id/perfil" params={{ id }} className="block"><NavItem icon={<UserCircle2 className="h-4 w-4" />} label="Meu perfil na pelada" /></Link>
          </nav>
          <div className="mt-auto pt-6">
            {isAdmin && <Link to="/pelada/$id/usuarios" params={{ id }} className="mb-2 block"><NavItem icon={<UserCog className="h-4 w-4" />} label="Gerenciamento de Usuários" /></Link>}
            {isAdmin && <button type="button" className="flex w-full items-center gap-2.5 rounded-xl border border-amber-400/30 bg-amber-400/5 px-3 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-400/10"><ShieldCheck className="h-4 w-4" /> Administrador</button>}
          </div>
          <div className="h-32 w-full shrink-0" aria-hidden />
        </aside>

        <section className="flex-1 px-5 py-8 md:px-10 md:py-10">
          <div className="mx-auto max-w-4xl space-y-6">
            <h1 className="text-3xl font-bold uppercase tracking-tight text-yellow-400 md:text-4xl drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]">
              ⚽ Partida
            </h1>
            <p className="text-sm text-zinc-400">
              {attendanceQuery.isLoading
                ? "Carregando lista de presença…"
                : `${confirmed.length} jogador${confirmed.length === 1 ? "" : "es"} confirmado${confirmed.length === 1 ? "" : "s"} na lista de presença.`}
            </p>

            {!liveMode && (
              <button
                type="button"
                onClick={() => setSorteioOpen(true)}
                disabled={!isAdmin}
                className="w-full rounded-2xl border-2 border-[var(--pelada-accent)] bg-[var(--pelada-accent)]/10 px-6 py-8 text-2xl font-black uppercase tracking-wider text-[var(--pelada-accent)] transition hover:bg-[var(--pelada-accent)]/20 hover:shadow-[0_0_50px_-8px_color-mix(in_oklab,var(--pelada-accent)_90%,transparent)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                ⚽ Sortear Times
              </button>
            )}
            {!liveMode && !isAdmin && <p className="text-center text-xs text-zinc-500">Somente o admin pode sortear.</p>}

            {!liveMode && referees.length > 0 && (
              <div className="rounded-2xl border-2 border-yellow-400/60 bg-yellow-400/5 px-4 py-3 shadow-[0_0_25px_-12px_rgba(250,204,21,0.7)]">
                <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-yellow-300/80">
                  🏁 Juiz da partida
                </p>
                <p className="text-sm font-bold text-zinc-100">
                  {referees.map((r) => r.full_name?.trim() || r.username || "Juiz").join(", ")}
                </p>
              </div>
            )}

            {!liveMode && canRegister && isSorteioSalvo && (
              <div className="flex flex-col gap-3 pt-2">
                <button type="button" onClick={copyTeams} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--pelada-accent)]/50 bg-[var(--pelada-accent)]/10 px-4 py-2 text-sm font-bold uppercase tracking-wider text-[var(--pelada-accent)] transition hover:bg-[var(--pelada-accent)]/20">
                  <ClipboardCopy className="h-4 w-4" /> Copiar Times
                </button>
                <button
                  type="button"
                  onClick={startLive}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-red-500 bg-red-500/10 px-6 py-5 text-lg font-black uppercase tracking-wider text-red-400 transition hover:bg-red-500/20 hover:shadow-[0_0_30px_-8px_rgba(239,68,68,0.7)]"
                >
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                  </span>
                  <Radio className="h-5 w-5 animate-pulse" /> Registrar Ao Vivo
                </button>
                <button type="button" onClick={startRegister} className="w-full rounded-2xl border-2 border-yellow-400 bg-yellow-400/10 px-6 py-5 text-lg font-black uppercase tracking-wider text-yellow-400 transition hover:bg-yellow-400/20 hover:shadow-[0_0_30px_-8px_rgba(250,204,21,0.7)]">
                  📋 Registrar Partida
                </button>
              </div>
            )}

            {!liveMode && isSorteioSalvo && saved && (
              <TeamsVersusView teamA={saved.teamA} teamB={saved.teamB} />
            )}

            {liveMode && liveMatch && (
              <>
                <div className="rounded-2xl border-2 border-red-500/60 bg-red-500/5 px-4 py-3 text-center">
                  <p className="inline-flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider text-red-400">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                    </span>
                    Modo Ao Vivo · Toque em um jogador para registrar
                  </p>
                </div>
                <LiveVersusView
                  teamA={liveMatch.teamA.players}
                  teamB={liveMatch.teamB.players}
                  onTap={(p, team) => setLiveTarget({ playerId: p.id, name: p.name, team })}
                />
                <button
                  type="button"
                  onClick={finishLive}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-red-500 bg-red-500 px-6 py-5 text-lg font-black uppercase tracking-wider text-white transition hover:bg-red-600"
                >
                  <OctagonAlert className="h-5 w-5" /> Finalizar Partida
                </button>
              </>
            )}
          </div>
        </section>
      </div>

      <Dialog open={sorteioOpen} onOpenChange={setSorteioOpen}>
        <DialogContent className="max-w-3xl border-[var(--pelada-accent)]/40 bg-zinc-950 text-zinc-100">
          <DialogHeader><DialogTitle className="text-2xl font-black uppercase tracking-wider text-[var(--pelada-accent)]">Escolha o Modo de Sorteio</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-2 md:grid-cols-3">
            <ModeCard icon={<MousePointerClick className="h-10 w-10" />} title="Separar Manual" desc="Controle total, mova jogador a jogador." onClick={() => openSeparation("manual")} />
            <ModeCard icon={<Scale className="h-10 w-10" />} title="Sorteio Justo" desc="Equilibra os times por nível técnico." onClick={() => openSeparation("fair")} highlighted />
            <ModeCard icon={<Dices className="h-10 w-10" />} title="Sorteio Aleatório" desc="Pura sorte." onClick={() => openSeparation("random")} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={sepOpen} onOpenChange={setSepOpen}>
        <DialogContent className="max-w-6xl border-[var(--pelada-accent)]/40 bg-zinc-950 text-zinc-100">
          <DialogHeader><DialogTitle className="text-2xl font-black uppercase tracking-wider text-[var(--pelada-accent)]">Interface de Separação</DialogTitle></DialogHeader>
          <div className={pool.length > 0 ? "grid grid-cols-1 gap-4 py-2 md:grid-cols-3" : "grid grid-cols-1 gap-4 py-2 md:grid-cols-2"}>
            <TeamColumn title="Time A" players={teamA} max={Math.ceil(enriched.length / 2)} accent="var(--pelada-accent)" onClick={(pid) => backToPool(pid)} />
            {pool.length > 0 && <PoolColumn players={pool} onMove={moveTo} />}
            <TeamColumn title="Time B" players={teamB} max={Math.ceil(enriched.length / 2)} accent="var(--pelada-accent)" onClick={(pid) => backToPool(pid)} />
          </div>
          <DialogFooter className="flex-row justify-center gap-3 sm:justify-center">
            <button type="button" onClick={() => runSorteio(sepMode)} className="inline-flex items-center gap-2 rounded-xl border border-zinc-500/40 bg-zinc-800/60 px-5 py-3 text-sm font-bold uppercase tracking-wider text-zinc-200">
              <RefreshCw className="h-4 w-4" /> Resortear
            </button>
            <button type="button" onClick={saveTeams} className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--pelada-accent)] bg-[var(--pelada-accent)] px-8 py-3 text-base font-black uppercase tracking-wider text-zinc-950">
              <Save className="h-5 w-5" /> Salvar Times
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editing && <EditMatchDialog match={editing} onClose={() => setEditing(null)} onSave={handleSaveMatch} />}

      <Dialog open={!!liveTarget} onOpenChange={(o) => { if (!o) setLiveTarget(null); }}>
        <DialogContent className="max-w-sm border-red-500/40 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-black uppercase tracking-wider text-red-400">
              {liveTarget?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => registerLiveStat("goals")}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-emerald-500 bg-emerald-500/10 px-6 py-8 text-2xl font-black uppercase tracking-wider text-emerald-400 transition hover:bg-emerald-500/20"
            >
              <span className="text-4xl">⚽</span>
              GOL
            </button>
            <button
              type="button"
              onClick={() => registerLiveStat("assists")}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-sky-500 bg-sky-500/10 px-6 py-8 text-2xl font-black uppercase tracking-wider text-sky-400 transition hover:bg-sky-500/20"
            >
              <span className="text-4xl">👟</span>
              Assistência
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function NavItem({ icon, label, active, gold }: { icon: React.ReactNode; label: string; active?: boolean; gold?: boolean }) {
  return (
    <div className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
      active ? (gold ? "bg-yellow-500/10 text-yellow-400 shadow-[inset_0_0_0_1px_rgba(250,204,21,0.3)]" : "bg-[var(--pelada-accent)]/10 text-[var(--pelada-accent)] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--pelada-accent)_25%,transparent)]")
        : gold ? "text-yellow-500 hover:bg-yellow-500/10"
        : "text-zinc-300 hover:bg-white/5 hover:text-zinc-100"
    }`}>{icon}{label}</div>
  );
}

function TeamsVersusView({ teamA, teamB }: { teamA: Player[]; teamB: Player[] }) {
  const sortGK = (a: Player, b: Player) =>
    Number(b.isGoalkeeper) - Number(a.isGoalkeeper);
  const a = [...teamA].sort(sortGK);
  const b = [...teamB].sort(sortGK);
  return (
    <div className="relative flex w-full items-start justify-between gap-2 rounded-2xl border border-[var(--pelada-accent)]/30 bg-zinc-900/50 p-3 backdrop-blur-xl sm:gap-4 sm:p-5">
      <TeamSideColumn title="Time A" players={a} accent="var(--pelada-accent)" align="left" />
      <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 text-xl font-bold italic text-zinc-500 sm:top-4 sm:text-2xl">
        VS
      </div>
      <TeamSideColumn title="Time B" players={b} accent="#ef4444" align="right" />
    </div>
  );
}

function TeamSideColumn({
  title,
  players,
  accent,
  align,
}: {
  title: string;
  players: Player[];
  accent: string;
  align: "left" | "right";
}) {
  return (
    <div className={`flex w-1/2 min-w-0 flex-col gap-1.5 ${align === "right" ? "items-end text-right" : "items-start text-left"}`}>
      <p
        className="mb-1 text-xs font-black uppercase tracking-wider sm:text-sm"
        style={{ color: accent }}
      >
        {title}
      </p>
      {players.length === 0 ? (
        <p className="text-xs text-zinc-500">Sem jogadores</p>
      ) : (
        players.map((p) => (
          <div
            key={p.id}
            className={`flex w-full min-w-0 items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-950/60 px-2 py-1.5 text-xs sm:text-sm ${
              align === "right" ? "flex-row-reverse" : ""
            }`}
          >
            <span className="shrink-0" aria-hidden>
              {p.isGoalkeeper ? "🧤" : "●"}
            </span>
            <span className="min-w-0 flex-1 truncate text-zinc-100">{p.name}</span>
          </div>
        ))
      )}
    </div>
  );
}

function TeamView({ title, players, accent }: { title: string; players: Player[]; accent: string }) {
  return (
    <div className="rounded-2xl border bg-zinc-900/50 p-5 backdrop-blur-xl" style={{ borderColor: `${accent}55`, boxShadow: `0 0 30px -12px ${accent}66` }}>
      <h3 className="mb-3 text-sm font-black uppercase tracking-wider" style={{ color: accent }}>{title}</h3>
      <ul className="space-y-1.5">
        {players.length === 0 ? <li className="text-xs text-zinc-500">Sem jogadores</li> : players.map((p) => (
          <li key={p.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100">
            <span style={{ color: p.isGoalkeeper ? "#60a5fa" : accent }}>●</span>
            {p.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ModeCard({ icon, title, desc, onClick, highlighted }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void; highlighted?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`flex flex-col items-center gap-3 rounded-2xl border bg-zinc-900/60 p-6 text-center transition hover:scale-[1.02] ${
      highlighted ? "border-[var(--pelada-accent)] shadow-[0_0_30px_-5px_color-mix(in_oklab,var(--pelada-accent)_60%,transparent)]" : "border-white/10 hover:border-[var(--pelada-accent)]/40"
    }`}>
      <span className="text-[var(--pelada-accent)]">{icon}</span>
      <p className="text-base font-black uppercase tracking-wider text-zinc-100">{title}</p>
      <p className="text-xs text-zinc-400">{desc}</p>
    </button>
  );
}

function TeamColumn({ title, players, max, accent, onClick }: { title: string; players: Player[]; max: number; accent: string; onClick: (pid: string) => void }) {
  return (
    <div className="flex min-h-[400px] flex-col gap-2 rounded-2xl border bg-zinc-900/60 p-4" style={{ borderColor: `${accent}66`, boxShadow: `0 0 30px -10px ${accent}66` }}>
      <div className="flex items-center justify-between pb-2">
        <p className="text-sm font-bold uppercase tracking-wider text-zinc-200">{title}</p>
        <span className="rounded-md px-2 py-0.5 text-[11px] font-black tabular-nums text-zinc-950" style={{ backgroundColor: accent }}>
          {String(players.length).padStart(2, "0")} / {String(max).padStart(2, "0")}
        </span>
      </div>
      {players.map((p) => (
        <button key={p.id} type="button" onClick={() => onClick(p.id)} className="flex items-center justify-between rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 text-left transition hover:border-[var(--pelada-accent)]/40">
          <span className="flex items-center gap-2 truncate"><span style={{ color: p.isGoalkeeper ? "#60a5fa" : "var(--pelada-accent)" }} className="text-xs">●</span><span className="truncate text-sm text-zinc-100">{p.name}</span></span>
          <span className="text-xs font-bold tabular-nums text-zinc-500">{(p.rating ?? 5).toFixed(1)}</span>
        </button>
      ))}
    </div>
  );
}

function PoolColumn({ players, onMove }: { players: Player[]; onMove: (pid: string, target: "A" | "B") => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div className="flex min-h-[400px] flex-col gap-2 rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
      <div className="flex items-center justify-between pb-2">
        <p className="text-sm font-bold uppercase tracking-wider text-zinc-200">Disponíveis</p>
        <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] font-black tabular-nums text-zinc-300">{String(players.length).padStart(2, "0")}</span>
      </div>
      {players.length === 0 ? <p className="py-10 text-center text-xs text-zinc-500">Todos distribuídos.</p> : players.map((p) => (
        <div key={p.id} className="rounded-lg border border-white/10 bg-zinc-950/70">
          <button type="button" onClick={() => setOpenId((c) => c === p.id ? null : p.id)} className="flex w-full items-center justify-between px-3 py-2 text-left">
            <span className="flex items-center gap-2 truncate"><span style={{ color: p.isGoalkeeper ? "#60a5fa" : "var(--pelada-accent)" }}>||</span><span className="truncate text-sm text-zinc-100">{p.name}</span></span>
            <span className="text-xs font-bold tabular-nums text-zinc-500">{(p.rating ?? 5).toFixed(1)}</span>
          </button>
          {openId === p.id && (
            <div className="flex gap-2 border-t border-white/10 p-2">
              <button type="button" onClick={() => { onMove(p.id, "A"); setOpenId(null); }} className="flex-1 rounded-md border border-[var(--pelada-accent)]/40 bg-[var(--pelada-accent)]/10 px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--pelada-accent)]">← Time A</button>
              <button type="button" onClick={() => { onMove(p.id, "B"); setOpenId(null); }} className="flex-1 rounded-md border border-[var(--pelada-accent)]/40 bg-[var(--pelada-accent)]/10 px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--pelada-accent)]">Time B →</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
