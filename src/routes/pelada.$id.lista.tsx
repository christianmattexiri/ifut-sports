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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

export const Route = createFileRoute("/pelada/$id/lista")({
  component: ListaPresencaPage,
  head: () => ({ meta: [{ title: "iFut — Lista de Presença" }] }),
});

type Match = {
  id: string;
  name: string;
  day_of_week: string | null;
  match_time: string | null;
  location: string | null;
  logo_url: string | null;
};

type Player = {
  id: string;
  name: string;
  isGoalkeeper: boolean;
  paid: boolean;
  rating?: number;
  avatarUrl?: string | null;
};

const MOCK_PLAYERS: Player[] = [
  { id: "1", name: "Roger", isGoalkeeper: false, paid: true },
  { id: "2", name: "Xiri", isGoalkeeper: false, paid: false },
  { id: "3", name: "Sergio", isGoalkeeper: false, paid: false },
  { id: "4", name: "Lucas", isGoalkeeper: false, paid: false },
  { id: "5", name: "Tiago", isGoalkeeper: false, paid: false },
  { id: "6", name: "Edson", isGoalkeeper: false, paid: false },
  { id: "7", name: "Gui Torres", isGoalkeeper: false, paid: false },
  { id: "8", name: "Bruno Venzon", isGoalkeeper: false, paid: false },
  { id: "9", name: "Leo STR", isGoalkeeper: false, paid: false },
  { id: "10", name: "Paul", isGoalkeeper: false, paid: false },
  { id: "11", name: "Peleo", isGoalkeeper: false, paid: false },
  { id: "12", name: "Kel", isGoalkeeper: false, paid: false },
  { id: "13", name: "Sheik", isGoalkeeper: false, paid: false },
  { id: "14", name: "Fael", isGoalkeeper: false, paid: false },
  { id: "15", name: "Bolinho", isGoalkeeper: false, paid: false },
  { id: "16", name: "Sandro", isGoalkeeper: true, paid: true },
  { id: "17", name: "Orlandi", isGoalkeeper: false, paid: false },
  { id: "18", name: "Manga", isGoalkeeper: false, paid: false },
];

const LINE_LIMIT = 16;
const GK_LIMIT = 2;
const SUB_LIMIT = 2;

function ListaPresencaPage() {
  const navigate = useNavigate();
  const { id } = useParams({ from: "/pelada/$id/lista" });
  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>(MOCK_PLAYERS);
  const [meInList, setMeInList] = useState(false);
  const [friendOpen, setFriendOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [friendName, setFriendName] = useState("");
  const [friendRating, setFriendRating] = useState(3);
  const [friendGK, setFriendGK] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/" });
        return;
      }
      const { data: m } = await supabase
        .from("matches")
        .select("id, name, day_of_week, match_time, location, logo_url")
        .eq("id", id)
        .maybeSingle();
      setMatch(m as Match | null);
    })();
  }, [navigate, id]);

  // Categorize players based on entry order: line / goalkeepers / suplentes
  const categorized = useMemo(() => {
    const line: Player[] = [];
    const gks: Player[] = [];
    const subs: Player[] = [];
    for (const p of players) {
      if (p.isGoalkeeper) {
        if (gks.length < GK_LIMIT) gks.push(p);
        else subs.push(p);
      } else {
        if (line.length < LINE_LIMIT) line.push(p);
        else subs.push(p);
      }
    }
    return { line, gks, subs };
  }, [players]);

  const orderedPlayers = useMemo(
    () => [...categorized.line, ...categorized.gks, ...categorized.subs],
    [categorized],
  );

  const addPlayer = (name: string, isGK = false) => {
    if (!name.trim()) return;
    const totalConfirmed = categorized.line.length + categorized.gks.length;
    const totalSubs = categorized.subs.length;
    if (totalConfirmed >= LINE_LIMIT + GK_LIMIT && totalSubs >= SUB_LIMIT) {
      toast.error("Lista cheia (incluindo suplentes)");
      return;
    }
    setPlayers((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: name.trim(), isGoalkeeper: isGK, paid: false },
    ]);
  };

  const removePlayer = (pid: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== pid));
  };

  const togglePaid = (pid: string) => {
    setPlayers((prev) => prev.map((p) => (p.id === pid ? { ...p, paid: !p.paid } : p)));
  };

  const toggleMyName = () => {
    if (meInList) {
      setPlayers((prev) => prev.filter((p) => p.id !== "me"));
      setMeInList(false);
    } else {
      setPlayers((prev) => [
        ...prev,
        { id: "me", name: "Você", isGoalkeeper: false, paid: false },
      ]);
      setMeInList(true);
    }
  };

  const handleSubmitFriend = () => {
    addPlayer(friendName, friendGK);
    setFriendName("");
    setFriendRating(3);
    setFriendGK(false);
    setFriendOpen(false);
  };

  const buildWhatsAppText = () => {
    const today = new Date().toLocaleDateString("pt-BR");
    const confirmed = [...categorized.line, ...categorized.gks];
    const linesConfirmed = confirmed
      .map((p) => `${p.name}${p.paid ? " ✅" : ""}${p.isGoalkeeper ? " 🧤" : ""}`)
      .join("\n");
    const linesSubs = categorized.subs.map((p) => p.name).join("\n");
    return `🤖 Mensagem automática: Lista de presença para ${today}

⚽ ${match?.name ?? "Pelada"} ⚽

🗓 ${match?.day_of_week ?? "-"} | ⏰ ${match?.match_time ?? "-"}
📍 Local: ${match?.location ?? "-"}

LISTA DE CONFIRMADOS:
${linesConfirmed || "(vazio)"}

SUPLENTES:
${linesSubs || "(nenhum)"}

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

  const peladaName = match?.name ?? "Minha Pelada";
  const peladaLogo = match?.logo_url ?? null;
  const lineCount = categorized.line.length;
  const gkCount = categorized.gks.length;
  const subCount = categorized.subs.length;

  return (
    <main className="relative min-h-screen w-full bg-zinc-950 text-zinc-100 font-sans antialiased">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 left-1/3 h-[480px] w-[480px] rounded-full bg-[#00FF00]/10 blur-[160px]"
      />

      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
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
            <p className="text-center text-base font-bold tracking-tight text-white">{peladaName}</p>
          </div>

          <nav className="space-y-1.5">
            <Link to="/pelada/$id" params={{ id }} className="block">
              <NavItem icon={<Home className="h-4 w-4" />} label="Início" />
            </Link>
            <NavItem icon={<ClipboardList className="h-4 w-4" />} label="Lista de Presença" active />
            <NavItem icon={<History className="h-4 w-4" />} label="Histórico" />
            <NavItem icon={<BarChart3 className="h-4 w-4" />} label="Rankings" />
            <NavItem icon={<UserCircle2 className="h-4 w-4" />} label="Meu perfil na pelada" />
          </nav>

          <div className="mt-auto pt-6">
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-xl border border-amber-400/30 bg-amber-400/5 px-3 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-400/10"
            >
              <ShieldCheck className="h-4 w-4" />
              Administrador
            </button>
          </div>
        </aside>

        {/* Main */}
        <section className="flex-1 px-4 py-6 md:px-10 md:py-10">
          <div className="mx-auto max-w-3xl space-y-4">
            {/* Painel 1 — Próxima Pelada */}
            <div className="relative rounded-2xl border border-[#00FF00]/40 bg-zinc-900/50 p-5 backdrop-blur-xl shadow-[0_0_30px_-12px_rgba(0,255,0,0.6)]">
              <button
                type="button"
                aria-label="Editar"
                className="absolute right-3 top-3 rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/5 hover:text-[#00FF00]"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#00FF00]">
                Próxima Pelada
              </h3>
              <div className="space-y-2 text-sm text-zinc-200">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#00FF00]" />
                  <span>
                    {match?.day_of_week ?? "Domingo"} – {match?.match_time ?? "9h"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#00FF00]" />
                  <span>{match?.location ?? "Local a definir"}</span>
                </div>
              </div>
            </div>

            {/* Painel 2 — Valores */}
            <div className="relative rounded-2xl border border-amber-400/30 bg-zinc-900/40 p-5 backdrop-blur-xl">
              <button
                type="button"
                aria-label="Editar valores"
                className="absolute right-3 top-3 rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/5 hover:text-amber-300"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-300">
                <DollarSign className="h-4 w-4" />
                Valores
              </h3>
              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <p className="text-zinc-300">
                  Mensalista: <span className="font-semibold text-amber-300">R$ 15,00</span>
                </p>
                <p className="text-zinc-300">
                  Avulso: <span className="font-semibold text-amber-300">R$ 17,00</span>
                </p>
                <p className="text-zinc-300">
                  Goleiro: <span className="font-semibold text-amber-300">R$ 6,00</span>
                </p>
                <p className="text-zinc-300">
                  Pix: <span className="font-semibold text-amber-300">04172316018</span>
                </p>
              </div>
            </div>

            {/* Painel 3 — Vagas */}
            <div className="grid grid-cols-3 gap-3">
              <SlotCard
                icon={<Users className="h-4 w-4" />}
                label="Linha"
                value={`${lineCount}/${LINE_LIMIT}`}
                color="#00FF00"
              />
              <SlotCard
                icon={<Hand className="h-4 w-4" />}
                label="Goleiros"
                value={`${gkCount}/${GK_LIMIT}`}
                color="#00FF00"
              />
              <SlotCard
                icon={<ClipboardList className="h-4 w-4" />}
                label="Suplentes"
                value={`${subCount}/${SUB_LIMIT}`}
                color="#00FF00"
              />
            </div>

            {/* Botões de Ação - Jogador */}
            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={toggleMyName}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold uppercase tracking-wider transition ${
                  meInList
                    ? "border-[#00FF00]/50 bg-[#00FF00]/10 text-[#00FF00]"
                    : "border-white/10 bg-zinc-900/50 text-zinc-200 hover:border-[#00FF00]/40 hover:text-[#00FF00]"
                }`}
              >
                {meInList ? "Já na lista ✅" : "Colocar meu nome"}
              </button>
              <button
                type="button"
                onClick={() => setFriendOpen(true)}
                className="rounded-xl border border-blue-400/40 bg-blue-400/5 px-4 py-3 text-sm font-semibold uppercase tracking-wider text-blue-300 transition hover:bg-blue-400/10"
              >
                <UserPlus className="mr-2 inline h-4 w-4" />
                Chamar Amigo
              </button>
            </div>

            {/* Botões de Ação - Admin */}
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="w-full rounded-xl border border-amber-400/40 bg-amber-400/5 px-4 py-3 text-sm font-semibold uppercase tracking-wider text-amber-300 transition hover:bg-amber-400/10"
            >
              <Plus className="mr-2 inline h-4 w-4" />
              Adicionar Jogador
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={shareWhatsApp}
                className="rounded-xl border border-[#00FF00]/40 bg-[#00FF00]/5 px-4 py-3 text-sm font-semibold uppercase tracking-wider text-[#00FF00] transition hover:bg-[#00FF00]/10"
              >
                <Share2 className="mr-2 inline h-4 w-4" />
                WhatsApp
              </button>
              <button
                type="button"
                onClick={copyList}
                className="rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm font-semibold uppercase tracking-wider text-zinc-200 transition hover:border-white/20 hover:bg-zinc-900/70"
              >
                <ClipboardCopy className="mr-2 inline h-4 w-4" />
                Copiar Lista
              </button>
            </div>

            <button
              type="button"
              onClick={() => toast.info("Sorteio em breve")}
              className="w-full rounded-xl border border-amber-400/60 bg-amber-400/5 px-4 py-3 text-sm font-bold uppercase tracking-wider text-amber-300 transition hover:bg-amber-400/10 shadow-[0_0_20px_-10px_rgba(251,191,36,0.6)]"
            >
              <Shuffle className="mr-2 inline h-4 w-4" />
              Sortear Times
            </button>

            <button
              type="button"
              onClick={() => {
                if (confirm("Limpar toda a lista?")) {
                  setPlayers([]);
                  setMeInList(false);
                }
              }}
              className="w-full rounded-xl border border-red-700/60 bg-red-900/10 px-4 py-3 text-sm font-bold uppercase tracking-wider text-red-400 transition hover:bg-red-900/20"
            >
              <Trash2 className="mr-2 inline h-4 w-4" />
              Limpar Lista
            </button>

            {/* Lista de Jogadores */}
            <div className="space-y-2 pt-2">
              {orderedPlayers.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-500">
                  Nenhum jogador na lista ainda. Seja o primeiro!
                </p>
              ) : (
                orderedPlayers.map((p, idx) => {
                  const isSub = idx >= LINE_LIMIT + GK_LIMIT;
                  return (
                    <PlayerRow
                      key={p.id}
                      position={idx + 1}
                      player={p}
                      isSub={isSub}
                      onTogglePaid={() => togglePaid(p.id)}
                      onRemove={() => removePlayer(p.id)}
                    />
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Modal: Chamar Amigo */}
      <Dialog open={friendOpen} onOpenChange={setFriendOpen}>
        <DialogContent className="border-white/10 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-[#00FF00]">Chamar amigo</DialogTitle>
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
                Nota: <span className="text-[#00FF00]">{friendRating}</span>
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={friendRating}
                onChange={(e) => setFriendRating(Number(e.target.value))}
                className="w-full accent-[#00FF00]"
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
              className="w-full rounded-xl border border-[#00FF00]/50 bg-[#00FF00]/10 px-4 py-2.5 text-sm font-semibold uppercase tracking-wider text-[#00FF00] transition hover:bg-[#00FF00]/20"
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
            <DialogTitle className="text-amber-300">Adicionar jogador</DialogTitle>
          </DialogHeader>
          <AddPlayerForm
            onAdd={(name, isGK) => {
              addPlayer(name, isGK);
              setAddOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </main>
  );
}

function NavItem({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-[#00FF00]/10 text-[#00FF00] shadow-[inset_0_0_0_1px_rgba(0,255,0,0.25)]"
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
    <div className="rounded-2xl border border-white/10 bg-zinc-900/40 px-3 py-4 text-center backdrop-blur-xl">
      <div className="mb-1 flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider text-zinc-400">
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <p className="text-2xl font-black tracking-tight" style={{ color }}>
        {value.split("/")[0]}
        <span className="text-base font-medium text-zinc-500">/{value.split("/")[1]}</span>
      </p>
    </div>
  );
}

function PlayerRow({
  position,
  player,
  isSub,
  onTogglePaid,
  onRemove,
}: {
  position: number;
  player: Player;
  isSub: boolean;
  onTogglePaid: () => void;
  onRemove: () => void;
}) {
  const initial = player.name.charAt(0).toUpperCase();
  const accent = isSub ? "border-l-orange-400" : player.isGoalkeeper ? "border-l-blue-400" : "border-l-[#00FF00]";
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
      <button
        type="button"
        onClick={onTogglePaid}
        className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
          player.paid
            ? "bg-[#00FF00] text-zinc-950"
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
        className="rounded-md p-1.5 text-[#00FF00] transition hover:bg-[#00FF00]/10"
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

function AddPlayerForm({ onAdd }: { onAdd: (name: string, isGK: boolean) => void }) {
  const [name, setName] = useState("");
  const [isGK, setIsGK] = useState(false);
  return (
    <div className="space-y-4 py-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome do jogador"
        className="border-white/10 bg-zinc-900 text-zinc-100"
      />
      <label className="flex items-center gap-2 text-sm text-zinc-200">
        <Checkbox checked={isGK} onCheckedChange={(v) => setIsGK(Boolean(v))} />
        É goleiro?
      </label>
      <button
        type="button"
        onClick={() => onAdd(name, isGK)}
        className="w-full rounded-xl border border-amber-400/50 bg-amber-400/10 px-4 py-2.5 text-sm font-semibold uppercase tracking-wider text-amber-300 transition hover:bg-amber-400/20"
      >
        Adicionar
      </button>
    </div>
  );
}