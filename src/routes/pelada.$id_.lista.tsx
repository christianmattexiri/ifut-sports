import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Home,
  ClipboardList,
  History,
  BarChart3,
  UserCircle2,
  ShieldCheck,
  Trophy,
  MapPin,
  Pencil,
  Calendar,
  DollarSign,
  Users,
  Hand,
  ClipboardCopy,
  UserPlus,
  Share2,
  Plus,
  Shuffle,
  Trash2,
  Check,
  X,
  Save,
  UserCog,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isSuperAdminUsername } from "@/lib/admin";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { peladaMatchQuery, viewerQuery, matchAttendanceQuery } from "@/lib/pelada-queries";
import { matchRefereesQuery } from "@/lib/pelada-queries";
import { useAvatars } from "@/lib/avatars";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { MousePointerClick, Scale, Dices, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/pelada/$id_/lista")({
  component: ListaPresencaPage,
  head: () => ({ meta: [{ title: "iFut — Lista de Presença" }] }),
  loader: async ({ params, context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(peladaMatchQuery(params.id)),
      context.queryClient.ensureQueryData(viewerQuery()),
    ]);
  },
});

type Match = {
  id: string;
  name: string;
  day_of_week: string | null;
  match_time: string | null;
  location: string | null;
  logo_url: string | null;
  price_player: number | null;
  price_goalkeeper: number | null;
  pix_key: string | null;
};

type Player = {
  id: string;
  rowId: string;
  userId: string | null;
  name: string;
  isGoalkeeper: boolean;
  paid: boolean;
  rating?: number;
  avatarUrl?: string | null;
};

type Settings = {
  lineLimit: number;
  gkLimit: number;
  subLimit: number;
};

const DEFAULT_SETTINGS: Settings = {
  lineLimit: 16,
  gkLimit: 2,
  subLimit: 2,
};

function ListaPresencaPage() {
  const navigate = useNavigate();
  const { id } = useParams({ from: "/pelada/$id_/lista" });
  const queryClient = useQueryClient();
  const { data: matchData } = useQuery(peladaMatchQuery(id));
  const match = (matchData ?? null) as Match | null;
  const { data: viewer, isLoading: viewerLoading } = useQuery(viewerQuery());
  const me = viewer
    ? { id: viewer.id, fullName: viewer.full_name?.trim() || viewer.username || "Você" }
    : null;
  const isAdmin =
    !!viewer && !!matchData &&
    (matchData.admin_id === viewer.id || isSuperAdminUsername(viewer.username));
  useEffect(() => {
    if (!viewerLoading && viewer === null) navigate({ to: "/" });
  }, [viewer, viewerLoading, navigate]);

  // ===== Lista de presença: query compartilhada (lift state up) =====
  const attendanceQuery = useQuery(matchAttendanceQuery(id));
  const refereesQuery = useQuery(matchRefereesQuery(id));
  const referees = refereesQuery.data ?? [];
  const refereeUserIds = useMemo(
    () => new Set(referees.map((r) => r.user_id)),
    [referees],
  );
  const invalidateAttendance = () =>
    queryClient.invalidateQueries({ queryKey: ["match_attendance", id] });
  // Resolved from match_members: whether the viewer is registered as a GK
  // for this pelada (set on invite acceptance). Used so "Colocar meu nome"
  // adds them in the right slot.
  const [myIsGK, setMyIsGK] = useState(false);
  useEffect(() => {
    if (!viewer) { setMyIsGK(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("match_members")
        .select("is_goalkeeper")
        .eq("match_id", id)
        .eq("user_id", viewer.id)
        .maybeSingle();
      if (cancelled) return;
      setMyIsGK(!!data?.is_goalkeeper);
    })();
    return () => { cancelled = true; };
  }, [viewer, id]);
  const [friendOpen, setFriendOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [friendName, setFriendName] = useState("");
  const [friendRating, setFriendRating] = useState(3);
  const [friendGK, setFriendGK] = useState(false);

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [editMatchOpen, setEditMatchOpen] = useState(false);
  const [editValuesOpen, setEditValuesOpen] = useState(false);
  const [editLimitsOpen, setEditLimitsOpen] = useState(false);

  // Sorteio
  const [sorteioOpen, setSorteioOpen] = useState(false);
  const [sepOpen, setSepOpen] = useState(false);
  const [sepMode, setSepMode] = useState<"manual" | "fair" | "random">("manual");
  const [teamA, setTeamA] = useState<Player[]>([]);
  const [teamB, setTeamB] = useState<Player[]>([]);
  const [pool, setPool] = useState<Player[]>([]);

  // Settings ainda em localStorage (não é foco desta migração)
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const rawS = localStorage.getItem(`pelada:${id}:settings`);
      if (rawS) setSettings((s) => ({ ...s, ...JSON.parse(rawS) }));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [id]);
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    localStorage.setItem(`pelada:${id}:settings`, JSON.stringify(settings));
  }, [settings, id, hydrated]);

  // Players derivados da query de match_attendance
  const players = useMemo<Player[]>(() => {
    const rows = attendanceQuery.data ?? [];
    return rows
      .filter((r) => !r.is_referee && !(r.player_id && refereeUserIds.has(r.player_id)))
      .map((r) => {
      const userId = (r.player_id as string | null) ?? null;
      const rowId = r.id as string;
      const stableId = userId ?? rowId;
      return {
        id: stableId,
        rowId,
        userId,
        name: (r.player_name as string) ?? "Jogador",
        isGoalkeeper: !!r.is_goalkeeper,
        paid: !!r.has_paid,
        rating: Number(r.rating ?? 5),
      };
    });
  }, [attendanceQuery.data, refereeUserIds]);

  // Juízes que estão de fato na lista de presença (entraram via "Colocar meu
  // nome" ou foram adicionados pelo admin). NÃO listamos todos os juízes da
  // pelada automaticamente.
  const attendingReferees = useMemo(() => {
    const rows = attendanceQuery.data ?? [];
    return rows
      .filter((r) => r.is_referee || (r.player_id && refereeUserIds.has(r.player_id)))
      .map((r) => {
        const userId = (r.player_id as string | null) ?? null;
        const prof = userId ? referees.find((rf) => rf.user_id === userId) : null;
        return {
          rowId: r.id as string,
          userId,
          name:
            prof?.full_name?.trim() ||
            prof?.username ||
            (r.player_name as string) ||
            "Juiz",
          avatarUrl: prof?.avatar_url ?? null,
        };
      });
  }, [attendanceQuery.data, refereeUserIds, referees]);
  const isListLoading = attendanceQuery.isLoading;

  // Dados dinâmicos (Data/Hora/Local/Valores/Pix) vêm direto do Supabase.
  // Sem localStorage: garantem sincronização entre dispositivos.
  const dayOfWeek = match?.day_of_week ?? "";
  const matchTime = match?.match_time ?? "";
  const location = match?.location ?? "";
  const formatMoney = (v: number | null | undefined) =>
    v == null ? "" : v.toFixed(2).replace(".", ",");
  const valorLinha = formatMoney(match?.price_player);
  const valorGoleiro = formatMoney(match?.price_goalkeeper);
  const pix = match?.pix_key ?? "";

  const updateMatchMutation = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase
        .from("matches")
        .update(patch as never)
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pelada-match", id] });
    },
    onError: () => {
      toast.error("Não foi possível salvar as alterações");
    },
  });
  const parseMoney = (raw: string | undefined): number | null => {
    if (raw == null) return null;
    const cleaned = raw.replace(/[^\d,.-]/g, "").replace(",", ".");
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  };

  const { lineLimit, gkLimit, subLimit } = settings;
  const meInList = useMemo(
    () => (me ? players.some((p) => p.userId === me.id) : false),
    [players, me],
  );

  // Categorize players based on entry order: line / goalkeepers / suplentes
  const categorized = useMemo(() => {
    const line: Player[] = [];
    const gks: Player[] = [];
    const subs: Player[] = [];
    for (const p of players) {
      if (p.isGoalkeeper) {
        if (gks.length < gkLimit) gks.push(p);
        else subs.push(p);
      } else {
        if (line.length < lineLimit) line.push(p);
        else subs.push(p);
      }
    }
    return { line, gks, subs };
  }, [players, lineLimit, gkLimit]);

  const orderedPlayers = useMemo(
    () => [...categorized.line, ...categorized.gks, ...categorized.subs],
    [categorized],
  );
  const avatarMap = useAvatars(
    orderedPlayers.map((p) => p.userId).filter((v): v is string => !!v),
  );

  // Persist counts so other pages (Pelada home) can read them
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `pelada:${id}:counts`;
    localStorage.setItem(
      key,
      JSON.stringify({
        line: categorized.line.length,
        lineLimit,
        gks: categorized.gks.length,
        gkLimit,
        subs: categorized.subs.length,
        subLimit,
      }),
    );
  }, [id, categorized, lineLimit, gkLimit, subLimit]);

  const addPlayer = async (
    name: string,
    isGK = false,
    userId?: string,
    rating?: number,
    isReferee = false,
  ) => {
    if (!name.trim()) return;
    const totalConfirmed = categorized.line.length + categorized.gks.length;
    const totalSubs = categorized.subs.length;
    if (totalConfirmed >= lineLimit + gkLimit && totalSubs >= subLimit) {
      toast.error("Lista cheia (incluindo suplentes)");
      return;
    }
    // Onboarding via link direto: se o usuário logado está se inscrevendo,
    // garante que ele vire membro oficial da pelada antes de entrar na lista.
    if (userId && me?.id === userId) {
      const { data: existing } = await supabase
        .from("match_members")
        .select("user_id")
        .eq("match_id", id!)
        .eq("user_id", userId)
        .maybeSingle();
      const { data: matchRow } = await supabase
        .from("matches")
        .select("admin_id")
        .eq("id", id!)
        .maybeSingle();
      const isAdmin = matchRow?.admin_id === userId;
      if (!existing && !isAdmin) {
        const { error: memberErr } = await supabase
          .from("match_members")
          .insert({ match_id: id!, user_id: userId, is_goalkeeper: isGK });
        if (memberErr) {
          toast.error("Não foi possível vincular você à pelada");
          return;
        }
      }
    }
    // Se rating não foi passado mas é um usuário logado, herda a nota
    // que o admin definiu para ele dentro da pelada (match_members.rating).
    let effectiveRating = typeof rating === "number" ? rating : undefined;
    if (typeof effectiveRating !== "number" && userId) {
      const { data: memberRow } = await supabase
        .from("match_members")
        .select("rating")
        .eq("match_id", id!)
        .eq("user_id", userId)
        .maybeSingle();
      const r = (memberRow as { rating?: number | null } | null)?.rating;
      if (typeof r === "number") effectiveRating = r;
    }
    const { error } = await supabase.from("match_attendance").insert({
      match_id: id,
      player_id: userId ?? null,
      player_name: name.trim(),
      is_goalkeeper: isReferee ? false : isGK,
      has_paid: false,
      rating: typeof effectiveRating === "number" ? effectiveRating : 5,
      is_referee: isReferee,
    });
    if (error) {
      toast.error("Não foi possível adicionar à lista");
      return;
    }
    await invalidateAttendance();
  };

  const removePlayer = async (rowId: string) => {
    const { error } = await supabase.from("match_attendance").delete().eq("id", rowId);
    if (error) {
      toast.error("Não foi possível remover");
      return;
    }
    await invalidateAttendance();
  };

  const togglePaid = async (rowId: string) => {
    const cur = players.find((p) => p.rowId === rowId);
    if (!cur) return;
    const { error } = await supabase
      .from("match_attendance")
      .update({ has_paid: !cur.paid })
      .eq("id", rowId);
    if (error) {
      toast.error("Não foi possível atualizar pagamento");
      return;
    }
    await invalidateAttendance();
  };

  const toggleGK = async (rowId: string) => {
    const cur = players.find((p) => p.rowId === rowId);
    if (!cur) return;
    const { error } = await supabase
      .from("match_attendance")
      .update({ is_goalkeeper: !cur.isGoalkeeper })
      .eq("id", rowId);
    if (error) {
      toast.error("Não foi possível alternar goleiro");
      return;
    }
    await invalidateAttendance();
  };

  const toggleMyName = async () => {
    if (!me) return;
    if (meInList) {
      const mine = players.find((p) => p.userId === me.id);
      if (mine) await removePlayer(mine.rowId);
    } else {
      await addPlayer(me.fullName, myIsGK, me.id);
    }
  };

  const clearList = async () => {
    const { error } = await supabase.from("match_attendance").delete().eq("match_id", id);
    if (error) {
      toast.error("Não foi possível limpar a lista");
      return;
    }
    await invalidateAttendance();
  };

  const handleSubmitFriend = () => {
    addPlayer(friendName, friendGK, undefined, friendRating);
    setFriendName("");
    setFriendRating(5);
    setFriendGK(false);
    setFriendOpen(false);
  };

  const buildWhatsAppText = () => {
    const today = new Date().toLocaleDateString("pt-BR");
    // Vagas principais: linha + goleiros, em ordem (linha primeiro, depois goleiros)
    const principal = [...categorized.line, ...categorized.gks];
    const totalSlots = lineLimit + gkLimit;
    const linhasPrincipal: string[] = [];
    for (let i = 0; i < totalSlots; i++) {
      const p = principal[i];
      if (p) {
        const tags = `${p.paid ? " ✅" : ""}${p.isGoalkeeper ? " 🧤" : ""}`;
        linhasPrincipal.push(`${i + 1}. ${p.name}${tags}`);
      } else {
        linhasPrincipal.push(`${i + 1}.`);
      }
    }
    const linhasSubs = categorized.subs.map((p, i) => {
      const tags = `${p.paid ? " ✅" : ""}${p.isGoalkeeper ? " 🧤" : ""}`;
      return `${i + 1}. ${p.name}${tags}`;
    });

    return `🤖 Mensagem automática: Lista de presença para ${today}

⚽ ${match?.name ?? "Pelada"} ⚽

🗓 ${dayOfWeek || "-"} | ⏰ ${matchTime || "-"}
📍 Local: ${location || "-"}

*LISTA DE CONFIRMADOS:*
${linhasPrincipal.join("\n")}

*SUPLENTES:*
${linhasSubs.length ? linhasSubs.join("\n") : "—"}

Bora pro jogo! 🔥
👇 Confirme seu nome na lista no app!`;
  };

  const copyList = async () => {
    try {
      await navigator.clipboard.writeText(buildWhatsAppText());
      toast.success("Lista copiada para a área de transferência!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(buildWhatsAppText());
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleSaveAll = () => {
    // TODO: Salvar no Supabase (matches + lista de jogadores)
    toast.success("Lista e configurações salvas com sucesso!");
  };

  // ============ SORTEIO ============
  const confirmedPlayers = useMemo(
    () =>
      [...categorized.line, ...categorized.gks].map((p) => ({
        ...p,
        rating: p.rating ?? 5,
      })),
    [categorized],
  );

  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function runSorteio(mode: "manual" | "fair" | "random") {
    const all = confirmedPlayers;
    const gks = all.filter((p) => p.isGoalkeeper);
    const line = all.filter((p) => !p.isGoalkeeper);
    const a: Player[] = [];
    const b: Player[] = [];
    const remaining: Player[] = [];

    // Goleiros: 1 em cada time
    const shuffledGks = shuffle(gks);
    if (shuffledGks[0]) a.push(shuffledGks[0]);
    if (shuffledGks[1]) b.push(shuffledGks[1]);
    for (let i = 2; i < shuffledGks.length; i++) remaining.push(shuffledGks[i]);

    if (mode === "manual") {
      remaining.push(...line);
    } else if (mode === "random") {
      const sh = shuffle(line);
      const half = Math.ceil(sh.length / 2);
      a.push(...sh.slice(0, half));
      b.push(...sh.slice(half));
    } else {
      // fair: snake/greedy by rating
      const sorted = [...line].sort((x, y) => (y.rating ?? 5) - (x.rating ?? 5));
      const sum = (t: Player[]) => t.reduce((s, p) => s + (p.rating ?? 5), 0);
      for (const p of sorted) {
        const sa = sum(a.filter((x) => !x.isGoalkeeper));
        const sb = sum(b.filter((x) => !x.isGoalkeeper));
        if (sa <= sb) a.push(p);
        else b.push(p);
      }
    }

    setTeamA(a);
    setTeamB(b);
    setPool(remaining);
  }

  function openSeparation(mode: "manual" | "fair" | "random") {
    setSepMode(mode);
    runSorteio(mode);
    setSorteioOpen(false);
    setSepOpen(true);
  }

  function moveTo(playerId: string, target: "A" | "B") {
    const p =
      pool.find((x) => x.id === playerId) ||
      teamA.find((x) => x.id === playerId) ||
      teamB.find((x) => x.id === playerId);
    if (!p) return;
    setPool((prev) => prev.filter((x) => x.id !== playerId));
    setTeamA((prev) => prev.filter((x) => x.id !== playerId));
    setTeamB((prev) => prev.filter((x) => x.id !== playerId));
    if (target === "A") setTeamA((prev) => [...prev, p]);
    else setTeamB((prev) => [...prev, p]);
  }

  function backToPool(playerId: string) {
    const p = teamA.find((x) => x.id === playerId) || teamB.find((x) => x.id === playerId);
    if (!p) return;
    setTeamA((prev) => prev.filter((x) => x.id !== playerId));
    setTeamB((prev) => prev.filter((x) => x.id !== playerId));
    setPool((prev) => [...prev, p]);
  }

  function saveTeams() {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        `pelada:${id}:teams`,
        JSON.stringify({ teamA, teamB, savedAt: Date.now() }),
      );
    }
    // TODO: Salvar times no Supabase
    toast.success("Times salvos!");
    setSepOpen(false);
  }

  const peladaName = match?.name ?? "Minha Pelada";
  const peladaLogo = match?.logo_url ?? null;
  const lineCount = categorized.line.length;
  const gkCount = categorized.gks.length;
  const subCount = categorized.subs.length;

  return (
    <main className="relative min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-zinc-950 pt-14 text-zinc-100 font-sans antialiased pb-24">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 left-1/3 h-[480px] w-[480px] rounded-full bg-[var(--pelada-accent)]/10 blur-[160px]"
      />

      <div className="relative z-10 flex min-h-screen w-full max-w-[100vw]">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 flex-col overflow-y-auto border-r border-white/5 bg-zinc-900/40 px-5 pt-5 pb-32 backdrop-blur-xl md:flex">
          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard" })}
            className="mb-5 inline-flex items-center gap-1.5 self-start rounded-lg px-2 py-1 text-xs font-medium text-zinc-400 transition hover:text-[var(--pelada-accent)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao Início do App
          </button>

          <div className="flex flex-col items-center gap-2 pb-6">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[var(--pelada-accent)]/40 bg-zinc-900 shadow-[0_0_30px_-8px_color-mix(in_oklab,var(--pelada-accent)_70%,transparent)]">
              {peladaLogo ? (
                <img src={peladaLogo} alt={peladaName} className="h-full w-full object-cover" />
              ) : (
                <Trophy className="h-9 w-9 text-[var(--pelada-accent)]" />
              )}
            </div>
            <p className="text-center text-base font-bold tracking-tight text-white">{peladaName}</p>
          </div>

          <nav className="space-y-1.5">
            <Link to="/pelada/$id" params={{ id }} className="block">
              <NavItem icon={<Home className="h-4 w-4" />} label="Início" />
            </Link>
            <NavItem icon={<ClipboardList className="h-4 w-4" />} label="Lista de Presença" active />
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
          <div className="h-32 w-full shrink-0" aria-hidden />
        </aside>

        {/* Main */}
        <section className="min-w-0 flex-1 px-3 py-6 sm:px-4 md:px-10 md:py-10">
          <div className="mx-auto w-full max-w-3xl space-y-4">
            {/* Painel 1 — Próxima Pelada */}
            <div className="relative rounded-2xl border border-[var(--pelada-accent)]/40 bg-zinc-900/50 p-5 backdrop-blur-xl shadow-[0_0_30px_-12px_color-mix(in_oklab,var(--pelada-accent)_60%,transparent)]">
              {isAdmin && (
                <button
                  type="button"
                  aria-label="Editar"
                  onClick={() => setEditMatchOpen(true)}
                  className="absolute right-3 top-3 rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/5 hover:text-[var(--pelada-accent)]"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[var(--pelada-accent)]">
                Próxima Pelada
              </h3>
              <div className="space-y-2 text-sm text-zinc-200">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[var(--pelada-accent)]" />
                  <span>
                    {dayOfWeek || "Domingo"} – {matchTime || "9h"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[var(--pelada-accent)]" />
                  <span>{location || "Local a definir"}</span>
                </div>
              </div>
            </div>

            {/* Painel 2 — Valores */}
            <div className="relative rounded-2xl border border-amber-400/30 bg-zinc-900/40 p-5 backdrop-blur-xl">
              {isAdmin && (
                <button
                  type="button"
                  aria-label="Editar valores"
                  onClick={() => setEditValuesOpen(true)}
                  className="absolute right-3 top-3 rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/5 hover:text-amber-300"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-300">
                <DollarSign className="h-4 w-4" />
                Valores
              </h3>
              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <p className="text-zinc-300">
                  Linha: <span className="font-semibold text-amber-300">R$ {valorLinha}</span>
                </p>
                <p className="text-zinc-300">
                  Goleiro: <span className="font-semibold text-amber-300">R$ {valorGoleiro}</span>
                </p>
                <p className="text-zinc-300 sm:col-span-2">
                  Pix: <span className="font-semibold text-amber-300">{pix}</span>
                </p>
              </div>
            </div>

            {/* Painel 3 — Vagas */}
            <div className="relative">
              {isAdmin && (
                <button
                  type="button"
                  aria-label="Editar limites"
                  onClick={() => setEditLimitsOpen(true)}
                  className="absolute -top-2 right-0 z-10 rounded-lg border border-white/10 bg-zinc-900/80 p-1.5 text-zinc-400 transition hover:bg-white/5 hover:text-[var(--pelada-accent)]"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <SlotCard
                  icon={<Users className="h-4 w-4" />}
                  label="Linha"
                  value={isListLoading ? "…" : `${lineCount}/${lineLimit}`}
                  color="var(--pelada-accent)"
                />
                <SlotCard
                  icon={<Hand className="h-4 w-4" />}
                  label="Goleiros"
                  value={isListLoading ? "…" : `${gkCount}/${gkLimit}`}
                  color="var(--pelada-accent)"
                />
                <SlotCard
                  icon={<ClipboardList className="h-4 w-4" />}
                  label="Suplentes"
                  value={isListLoading ? "…" : `${subCount}/${subLimit}`}
                  color="var(--pelada-accent)"
                />
              </div>
            </div>

            {/* Botões de Ação - Jogador */}
            <div className="flex flex-col gap-3 pt-2 sm:grid sm:grid-cols-2 w-full">
              <button
                type="button"
                onClick={toggleMyName}
                className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold uppercase tracking-wider transition ${
                  meInList
                    ? "border-[var(--pelada-accent)]/50 bg-[var(--pelada-accent)]/10 text-[var(--pelada-accent)]"
                    : "border-white/10 bg-zinc-900/50 text-zinc-200 hover:border-[var(--pelada-accent)]/40 hover:text-[var(--pelada-accent)]"
                }`}
              >
                {meInList ? "Já na lista ✅" : "Colocar meu nome"}
              </button>
              <button
                type="button"
                onClick={() => setFriendOpen(true)}
                className="w-full rounded-xl border border-blue-400/40 bg-blue-400/5 px-4 py-3 text-sm font-semibold uppercase tracking-wider text-blue-300 transition hover:bg-blue-400/10"
              >
                <UserPlus className="mr-2 inline h-4 w-4" />
                Chamar Amigo
              </button>
            </div>

            {/* Botões de Ação - Admin */}
            {isAdmin && (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="w-full rounded-xl border border-amber-400/40 bg-amber-400/5 px-4 py-3 text-sm font-semibold uppercase tracking-wider text-amber-300 transition hover:bg-amber-400/10"
            >
              <Plus className="mr-2 inline h-4 w-4" />
              Adicionar Jogador
            </button>
            )}

            <div className="flex flex-col gap-2 w-full sm:flex-row sm:gap-3">
              <button
                type="button"
                onClick={shareWhatsApp}
                className="w-full rounded-xl border border-[var(--pelada-accent)]/40 bg-[var(--pelada-accent)]/5 px-4 py-3 text-sm font-semibold uppercase tracking-wider text-[var(--pelada-accent)] transition hover:bg-[var(--pelada-accent)]/10 sm:flex-1"
              >
                <Share2 className="mr-2 inline h-4 w-4" />
                WhatsApp
              </button>
              <button
                type="button"
                onClick={copyList}
                className="w-full rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm font-semibold uppercase tracking-wider text-zinc-200 transition hover:border-white/20 hover:bg-zinc-900/70 sm:flex-1"
              >
                <ClipboardCopy className="mr-2 inline h-4 w-4" />
                Copiar Lista
              </button>
            </div>

            {isAdmin && (
            <button
              type="button"
              onClick={handleSaveAll}
              className="w-full rounded-xl border-2 border-[var(--pelada-accent)] bg-[var(--pelada-accent)]/10 px-4 py-4 text-base font-black uppercase tracking-wider text-[var(--pelada-accent)] transition hover:bg-[var(--pelada-accent)]/20 shadow-[0_0_30px_-8px_color-mix(in_oklab,var(--pelada-accent)_80%,transparent)]"
            >
              <Save className="mr-2 inline h-5 w-5" />
              💾 Salvar Lista
            </button>
            )}

            {isAdmin && (
            <button
              type="button"
              onClick={() => {
                if (confirm("Limpar toda a lista?")) {
                  clearList();
                }
              }}
              className="w-full rounded-xl border border-red-700/60 bg-red-900/10 px-4 py-3 text-sm font-bold uppercase tracking-wider text-red-400 transition hover:bg-red-900/20"
            >
              <Trash2 className="mr-2 inline h-4 w-4" />
              Limpar Lista
            </button>
            )}

            {/* Lista de Jogadores */}
            <div className="space-y-2 pt-2">
              {referees.length > 0 && (
                <div className="space-y-2">
                  {referees.map((r) => {
                    const display = r.full_name?.trim() || r.username || "Juiz";
                    return (
                      <div
                        key={r.user_id}
                        className="flex items-center gap-3 rounded-xl border-2 border-yellow-400/60 bg-yellow-400/5 px-3 py-2.5 shadow-[0_0_25px_-12px_rgba(250,204,21,0.7)] backdrop-blur-xl"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-yellow-400/50 bg-zinc-800 text-xs font-bold text-yellow-300">
                          {r.avatar_url ? (
                            <img src={r.avatar_url} alt={display} className="h-full w-full object-cover" />
                          ) : (
                            display.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-zinc-100">{display}</p>
                          <p className="truncate text-[11px] uppercase tracking-wider text-yellow-300/70">
                            Apita a partida
                          </p>
                        </div>
                        <span className="shrink-0 rounded-md border border-yellow-400/60 bg-yellow-400/15 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-yellow-300">
                          🏁 Juiz
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              {isListLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-14 animate-pulse rounded-xl border border-white/5 bg-zinc-900/40"
                    />
                  ))}
                </div>
              ) : orderedPlayers.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-500">
                  Lista vazia, adicione o primeiro jogador
                </p>
              ) : (
                orderedPlayers.map((p, idx) => {
                  const isSub = idx >= lineLimit + gkLimit;
                  const av =
                    (p.userId ? avatarMap[p.userId]?.avatar_url : null) ??
                    p.avatarUrl ??
                    null;
                  return (
                    <PlayerRow
                      key={p.id}
                      position={idx + 1}
                      player={{ ...p, avatarUrl: av }}
                      isSub={isSub}
                      canToggleGK={isAdmin}
                      onToggleGK={() => toggleGK(p.rowId)}
                      onTogglePaid={() => togglePaid(p.rowId)}
                      onRemove={() => removePlayer(p.rowId)}
                    />
                  );
                })
              )}
            </div>

            {/* Atalho para a tela de Partida */}
            {isAdmin && (
              <Link
                to="/pelada/$id/partida"
                params={{ id }}
                className="mt-6 block rounded-2xl border-2 border-amber-400/70 bg-amber-400/10 px-6 py-5 text-center text-base font-black uppercase tracking-wider text-yellow-400 transition hover:bg-amber-400/20 hover:shadow-[0_0_30px_-8px_rgba(250,204,21,0.7)]"
              >
                ⚽ Ir para Partida (Sortear Times)
              </Link>
            )}
          </div>
        </section>
      </div>

      {/* Modal: Modalidade de Sorteio */}
      <Dialog open={sorteioOpen} onOpenChange={setSorteioOpen}>
        <DialogContent className="max-w-3xl border-[var(--pelada-accent)]/40 bg-zinc-950 text-zinc-100 shadow-[0_0_60px_-10px_color-mix(in_oklab,var(--pelada-accent)_50%,transparent)]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-wider text-[var(--pelada-accent)]">
              | Escolha o Modo de Sorteio
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-2 md:grid-cols-3">
            <ModeCard
              icon={<MousePointerClick className="h-10 w-10" />}
              title="Separar Manual"
              desc="Controle total. Arraste e solte ou clique para mover."
              onClick={() => openSeparation("manual")}
            />
            <ModeCard
              icon={<Scale className="h-10 w-10" />}
              title="Sorteio Justo"
              desc="Algoritmo inteligente que equilibra os times por nível técnico."
              onClick={() => openSeparation("fair")}
              highlighted
            />
            <ModeCard
              icon={<Dices className="h-10 w-10" />}
              title="Sorteio Aleatório"
              desc="Pura sorte. Deixe o destino decidir."
              onClick={() => openSeparation("random")}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Interface de Separação */}
      <Dialog open={sepOpen} onOpenChange={setSepOpen}>
        <DialogContent className="max-w-6xl border-[var(--pelada-accent)]/40 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-wider text-[var(--pelada-accent)]">
              | Interface de Separação
            </DialogTitle>
          </DialogHeader>
          <div className={pool.length > 0 ? "grid grid-cols-1 gap-4 py-2 md:grid-cols-3" : "grid grid-cols-1 gap-4 py-2 md:grid-cols-2"}>
            <TeamColumn
              title="Time A"
              players={teamA}
              max={Math.ceil(confirmedPlayers.length / 2)}
              accent="var(--pelada-accent)"
              onPlayerClick={(pid) => backToPool(pid)}
            />
            {pool.length > 0 && (
              <PoolColumn
                players={pool}
                onMove={(pid, t) => moveTo(pid, t)}
              />
            )}
            <TeamColumn
              title="Time B"
              players={teamB}
              max={Math.ceil(confirmedPlayers.length / 2)}
              accent="var(--pelada-accent)"
              onPlayerClick={(pid) => backToPool(pid)}
            />
          </div>
          <DialogFooter className="flex-row justify-center gap-3 sm:justify-center">
            <button
              type="button"
              onClick={() => runSorteio(sepMode)}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-500/40 bg-zinc-800/60 px-5 py-3 text-sm font-bold uppercase tracking-wider text-zinc-200 transition hover:bg-zinc-800"
            >
              <RefreshCw className="h-4 w-4" />
              Resortear
            </button>
            <button
              type="button"
              onClick={saveTeams}
              className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--pelada-accent)] bg-[var(--pelada-accent)] px-8 py-3 text-base font-black uppercase tracking-wider text-zinc-950 shadow-[0_0_40px_-5px_color-mix(in_oklab,var(--pelada-accent)_90%,transparent)] transition hover:bg-[var(--pelada-accent)]/90"
            >
              <Save className="h-5 w-5" />
              Salvar Times
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Chamar Amigo */}
      <Dialog open={friendOpen} onOpenChange={setFriendOpen}>
        <DialogContent className="border-white/10 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-[var(--pelada-accent)]">Chamar amigo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-zinc-400">Nome</label>
              <Input
                value={friendName}
                onChange={(e) => setFriendName(e.target.value)}
                placeholder="Nome do amigo"
                className="border-white/10 bg-zinc-900 text-zinc-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                Nota: <span className="text-[var(--pelada-accent)]">{friendRating}</span>
              </label>
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={friendRating}
                onChange={(e) => setFriendRating(Number(e.target.value))}
                className="w-full accent-[var(--pelada-accent)]"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-200">
              <Checkbox
                checked={friendGK}
                onCheckedChange={(v) => setFriendGK(Boolean(v))}
              />
              É goleiro?
            </label>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={handleSubmitFriend}
              className="w-full rounded-xl border border-[var(--pelada-accent)]/50 bg-[var(--pelada-accent)]/10 px-4 py-2.5 text-sm font-semibold uppercase tracking-wider text-[var(--pelada-accent)] transition hover:bg-[var(--pelada-accent)]/20"
            >
              Adicionar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Adicionar Jogador (genérico) */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="border-white/10 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-amber-300">Adicionar jogador da pelada</DialogTitle>
          </DialogHeader>
          <AddMemberPicker
            peladaId={id}
            excludeIds={players.map((p) => p.userId).filter((v): v is string => !!v)}
            open={addOpen}
            onAdd={(profile, isGK) => {
              const display = profile.full_name?.trim() || profile.username || "Jogador";
              addPlayer(display, isGK, profile.id);
              setAddOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Próxima Pelada */}
      <EditDialog
        open={editMatchOpen}
        onOpenChange={setEditMatchOpen}
        title="Editar Próxima Pelada"
        accent="var(--pelada-accent)"
        fields={[
          { key: "dayOfWeek", label: "Dia da semana", value: dayOfWeek },
          { key: "matchTime", label: "Horário", value: matchTime },
          { key: "location", label: "Local", value: location },
        ]}
        onSave={(vals) =>
          updateMatchMutation.mutate({
            day_of_week: vals.dayOfWeek ?? dayOfWeek,
            match_time: vals.matchTime ?? matchTime,
            location: vals.location ?? location,
          })
        }
      />

      {/* Modal: Editar Valores */}
      <EditDialog
        open={editValuesOpen}
        onOpenChange={setEditValuesOpen}
        title="Editar Valores"
        accent="#fbbf24"
        fields={[
          { key: "valorLinha", label: "Valor Linha (R$)", value: valorLinha },
          { key: "valorGoleiro", label: "Valor Goleiro (R$)", value: valorGoleiro },
          { key: "pix", label: "Chave Pix", value: pix, placeholder: "Sua chave pix AQUI" },
        ]}
        onSave={(vals) =>
          updateMatchMutation.mutate({
            price_player: parseMoney(vals.valorLinha) ?? match?.price_player ?? null,
            price_goalkeeper: parseMoney(vals.valorGoleiro) ?? match?.price_goalkeeper ?? null,
            pix_key: vals.pix ?? pix,
          })
        }
      />

      {/* Modal: Editar Limites */}
      <EditDialog
        open={editLimitsOpen}
        onOpenChange={setEditLimitsOpen}
        title="Editar Limites de Vagas"
        accent="var(--pelada-accent)"
        fields={[
          { key: "lineLimit", label: "Limite de Linha", value: String(settings.lineLimit), type: "number" },
          { key: "gkLimit", label: "Limite de Goleiros", value: String(settings.gkLimit), type: "number" },
          { key: "subLimit", label: "Limite de Suplentes", value: String(settings.subLimit), type: "number" },
        ]}
        onSave={(vals) =>
          setSettings((s) => ({
            ...s,
            lineLimit: Number(vals.lineLimit ?? s.lineLimit) || s.lineLimit,
            gkLimit: Number(vals.gkLimit ?? s.gkLimit) || s.gkLimit,
            subLimit: Number(vals.subLimit ?? s.subLimit) || s.subLimit,
          }))
        }
      />
    </main>
  );
}

function NavItem({ icon, label, active, gold }: { icon: React.ReactNode; label: string; active?: boolean; gold?: boolean }) {
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
      {label}
    </div>
  );
}

function SlotCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-zinc-900/40 px-2 py-3 text-center backdrop-blur-xl sm:px-3 sm:py-4">
      <div className="mb-1 flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-zinc-400 sm:gap-1.5 sm:text-xs">
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <p className="text-xl font-black tracking-tight sm:text-2xl" style={{ color }}>
        {value.split("/")[0]}
        <span className="text-sm font-medium text-zinc-500 sm:text-base">/{value.split("/")[1]}</span>
      </p>
    </div>
  );
}

function PlayerRow({
  position,
  player,
  isSub,
  canToggleGK,
  onToggleGK,
  onTogglePaid,
  onRemove,
}: {
  position: number;
  player: Player;
  isSub: boolean;
  canToggleGK?: boolean;
  onToggleGK?: () => void;
  onTogglePaid: () => void;
  onRemove: () => void;
}) {
  const initial = player.name.charAt(0).toUpperCase();
  const accent = isSub ? "border-l-orange-400" : player.isGoalkeeper ? "border-l-blue-400" : "border-l-[var(--pelada-accent)]";
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-white/10 border-l-2 ${accent} bg-zinc-900/40 py-2.5 pl-3 pr-2 backdrop-blur-xl`}
    >
      <span className="w-6 text-xs font-medium tabular-nums text-zinc-500">{position}</span>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-800 text-xs font-bold text-zinc-300">
        {player.avatarUrl ? (
          <img src={player.avatarUrl} alt={player.name} className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </div>
      <p className="flex-1 truncate text-sm font-medium text-zinc-100">{player.name}</p>
      {player.isGoalkeeper && (
        <span className="rounded-md bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-300">
          GK
        </span>
      )}
      {isSub && (
        <span className="rounded-md bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-300">
          Suplente
        </span>
      )}
      {canToggleGK && (
        <button
          type="button"
          onClick={onToggleGK}
          aria-label={player.isGoalkeeper ? "Tornar jogador de linha" : "Tornar goleiro"}
          title={player.isGoalkeeper ? "Tornar jogador de linha" : "Tornar goleiro"}
          className={`rounded-md p-1.5 transition ${
            player.isGoalkeeper
              ? "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
              : "text-zinc-500 hover:bg-blue-500/10 hover:text-blue-300"
          }`}
        >
          <Hand className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        onClick={onTogglePaid}
        className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
          player.paid
            ? "bg-[var(--pelada-accent)] text-zinc-950"
            : "border border-white/10 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"
        }`}
      >
        <DollarSign className="h-3 w-3" />
        {player.paid ? "Pago" : "Pendente"}
      </button>
      <button
        type="button"
        onClick={onTogglePaid}
        aria-label="Confirmar"
        className="rounded-md p-1.5 text-[var(--pelada-accent)] transition hover:bg-[var(--pelada-accent)]/10"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remover"
        className="rounded-md p-1.5 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

type MemberProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

function AddMemberPicker({
  peladaId,
  excludeIds,
  open,
  onAdd,
}: {
  peladaId: string;
  excludeIds: string[];
  open: boolean;
  onAdd: (profile: MemberProfile, isGK: boolean) => void;
}) {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>("");
  const [isGK, setIsGK] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setSelected("");
    setIsGK(false);
    (async () => {
      const { data: m } = await supabase
        .from("matches")
        .select("admin_id")
        .eq("id", peladaId)
        .maybeSingle();
      const { data: rows } = await supabase
        .from("match_members")
        .select("user_id")
        .eq("match_id", peladaId);
      const ids = new Set<string>();
      if (m?.admin_id) ids.add(m.admin_id);
      for (const r of (rows ?? []) as any[]) ids.add(r.user_id);
      const list = Array.from(ids);
      if (list.length === 0) {
        if (!cancelled) { setMembers([]); setLoading(false); }
        return;
      }
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", list);
      if (cancelled) return;
      setMembers(((profs ?? []) as MemberProfile[]));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, peladaId]);

  const exclude = new Set(excludeIds);
  const available = members.filter((m) => !exclude.has(m.id));

  return (
    <div className="space-y-4 py-2">
      {loading ? (
        <p className="py-6 text-center text-sm text-zinc-400">Carregando membros...</p>
      ) : available.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-400">
          Todos os membros da pelada já estão na lista.
        </p>
      ) : (
        <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {available.map((p) => {
            const display = p.full_name?.trim() || p.username || "Jogador";
            const isSel = selected === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected(p.id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                  isSel
                    ? "border-amber-400/70 bg-amber-400/10"
                    : "border-white/10 bg-zinc-900/40 hover:border-amber-400/30"
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-800 text-xs font-bold text-zinc-300">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={display} className="h-full w-full object-cover" />
                  ) : (
                    display.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-100">{display}</p>
                  {p.username && (
                    <p className="truncate text-xs text-zinc-500">@{p.username}</p>
                  )}
                </div>
                {isSel && <Check className="h-4 w-4 text-amber-300" />}
              </button>
            );
          })}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-zinc-200">
        <Checkbox checked={isGK} onCheckedChange={(v) => setIsGK(Boolean(v))} />
        É goleiro?
      </label>

      <button
        type="button"
        disabled={!selected}
        onClick={() => {
          const p = available.find((x) => x.id === selected);
          if (p) onAdd(p, isGK);
        }}
        className="w-full rounded-xl border border-amber-400/50 bg-amber-400/10 px-4 py-2.5 text-sm font-semibold uppercase tracking-wider text-amber-300 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Adicionar à lista
      </button>
    </div>
  );
}

type EditField = { key: string; label: string; value: string; type?: string; placeholder?: string };

function ModeCard({
  icon,
  title,
  desc,
  onClick,
  highlighted,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
  highlighted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-3 rounded-2xl border bg-zinc-900/60 p-6 text-center transition hover:scale-[1.02] hover:bg-zinc-900 ${
        highlighted
          ? "border-[var(--pelada-accent)] shadow-[0_0_30px_-5px_color-mix(in_oklab,var(--pelada-accent)_60%,transparent)]"
          : "border-white/10 hover:border-[var(--pelada-accent)]/40"
      }`}
    >
      <span className="text-[var(--pelada-accent)] drop-shadow-[0_0_10px_color-mix(in_oklab,var(--pelada-accent)_70%,transparent)]">{icon}</span>
      <p className="text-base font-black uppercase tracking-wider text-zinc-100">{title}</p>
      <p className="text-xs leading-relaxed text-zinc-400">{desc}</p>
    </button>
  );
}

function TeamColumn({
  title,
  players,
  max,
  accent,
  onPlayerClick,
}: {
  title: string;
  players: Player[];
  max: number;
  accent: string;
  onPlayerClick: (pid: string) => void;
}) {
  return (
    <div
      className="flex min-h-[400px] flex-col gap-2 rounded-2xl border bg-zinc-900/60 p-4"
      style={{ borderColor: `${accent}66`, boxShadow: `0 0 30px -10px ${accent}66` }}
    >
      <div className="flex items-center justify-between pb-2">
        <p className="text-sm font-bold uppercase tracking-wider text-zinc-200">{title}</p>
        <span
          className="rounded-md px-2 py-0.5 text-[11px] font-black tabular-nums text-zinc-950"
          style={{ backgroundColor: accent }}
        >
          {String(players.length).padStart(2, "0")} / {String(max).padStart(2, "0")}
        </span>
      </div>
      {players.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onPlayerClick(p.id)}
          className="flex items-center justify-between rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 text-left transition hover:border-[var(--pelada-accent)]/40"
          title="Clique para devolver à coluna Disponíveis"
        >
          <span className="flex items-center gap-2 truncate">
            <span style={{ color: p.isGoalkeeper ? "#60a5fa" : "var(--pelada-accent)" }} className="text-xs">●</span>
            <span className="truncate text-sm text-zinc-100">{p.name}</span>
          </span>
          <span className="text-xs font-bold tabular-nums text-zinc-500">
            {(p.rating ?? 5).toFixed(1)}
          </span>
        </button>
      ))}
    </div>
  );
}

function PoolColumn({
  players,
  onMove,
}: {
  players: Player[];
  onMove: (pid: string, target: "A" | "B") => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div className="flex min-h-[400px] flex-col gap-2 rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
      <div className="flex items-center justify-between pb-2">
        <p className="text-sm font-bold uppercase tracking-wider text-zinc-200">Disponíveis</p>
        <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] font-black tabular-nums text-zinc-300">
          {String(players.length).padStart(2, "0")}
        </span>
      </div>
      {players.length === 0 ? (
        <p className="py-10 text-center text-xs text-zinc-500">Todos os jogadores foram distribuídos.</p>
      ) : (
        players.map((p) => (
          <div key={p.id} className="rounded-lg border border-white/10 bg-zinc-950/70">
            <button
              type="button"
              onClick={() => setOpenId((cur) => (cur === p.id ? null : p.id))}
              className="flex w-full items-center justify-between px-3 py-2 text-left"
            >
              <span className="flex items-center gap-2 truncate">
                <span style={{ color: p.isGoalkeeper ? "#60a5fa" : "var(--pelada-accent)" }} className="text-xs">||</span>
                <span className="truncate text-sm text-zinc-100">{p.name}</span>
              </span>
              <span className="text-xs font-bold tabular-nums text-zinc-500">
                {(p.rating ?? 5).toFixed(1)}
              </span>
            </button>
            {openId === p.id && (
              <div className="flex gap-2 border-t border-white/10 p-2">
                <button
                  type="button"
                  onClick={() => {
                    onMove(p.id, "A");
                    setOpenId(null);
                  }}
                  className="flex-1 rounded-md border border-[var(--pelada-accent)]/40 bg-[var(--pelada-accent)]/10 px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--pelada-accent)] transition hover:bg-[var(--pelada-accent)]/20"
                >
                  ← Time A
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onMove(p.id, "B");
                    setOpenId(null);
                  }}
                  className="flex-1 rounded-md border border-[var(--pelada-accent)]/40 bg-[var(--pelada-accent)]/10 px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--pelada-accent)] transition hover:bg-[var(--pelada-accent)]/20"
                >
                  Time B →
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function EditDialog({
  open,
  onOpenChange,
  title,
  accent,
  fields,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  accent: string;
  fields: EditField[];
  onSave: (vals: Record<string, string>) => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      const init: Record<string, string> = {};
      fields.forEach((f) => (init[f.key] = f.value));
      setDraft(init);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-zinc-950 text-zinc-100">
        <DialogHeader>
          <DialogTitle style={{ color: accent }}>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                {f.label}
              </label>
              <Input
                type={f.type ?? "text"}
                value={draft[f.key] ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="border-white/10 bg-zinc-900 text-zinc-100"
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => {
              onSave(draft);
              onOpenChange(false);
              toast.success("Atualizado");
            }}
            className="w-full rounded-xl border px-4 py-2.5 text-sm font-semibold uppercase tracking-wider transition"
            style={{
              borderColor: `${accent}80`,
              backgroundColor: `${accent}1a`,
              color: accent,
            }}
          >
            Salvar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
