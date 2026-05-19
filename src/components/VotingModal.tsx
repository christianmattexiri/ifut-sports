import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, StarHalf, Check, ChevronRight } from "lucide-react";
import { useAvatars } from "@/lib/avatars";
import { useSubmitVote } from "@/lib/votes-cloud";

type Player = { id: string; name: string };
type Modes = { mvp: boolean; pereba: boolean; apitto: boolean };

export function VotingModal({
  open,
  onOpenChange,
  histId,
  voterId,
  players,
  modes,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  peladaId?: string;
  histId: string;
  voterId: string;
  players: Player[];
  modes: Modes;
}) {
  const candidates = useMemo(
    () => players.filter((p) => p.id !== voterId),
    [players, voterId],
  );
  const avatars = useAvatars(candidates.map((p) => p.id));
  const submitVote = useSubmitVote(histId);

  const [step, setStep] = useState<"mvp" | "pereba" | "apitto">(
    modes.apitto ? "apitto" : modes.mvp ? "mvp" : "pereba",
  );
  const [mvp, setMvp] = useState<string | null>(null);
  const [pereba, setPereba] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [apittoIdx, setApittoIdx] = useState(0);

  // Reset sequential index whenever the modal reopens.
  useEffect(() => {
    if (open) setApittoIdx(0);
  }, [open]);

  async function submitMvpPereba() {
    try {
      await submitVote.mutateAsync({
        voterId,
        mvpId: modes.mvp ? mvp : null,
        perebaId: modes.pereba ? pereba : null,
      });
    } finally {
      onOpenChange(false);
    }
  }

  async function submitApitto() {
    try {
      await submitVote.mutateAsync({ voterId, apittoRatings: ratings });
    } finally {
      onOpenChange(false);
    }
  }

  if (modes.apitto) {
    if (candidates.length === 0) return null;
    const cur = candidates[Math.min(apittoIdx, candidates.length - 1)];
    const rating = ratings[cur.id] ?? 0;
    const isLast = apittoIdx >= candidates.length - 1;
    const goNext = () => {
      if (isLast) submitApitto();
      else setApittoIdx((i) => i + 1);
    };
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto border-white/10 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-amber-400 text-center">
              ⭐ Avalie a Galera
              <span className="ml-2 text-xs font-mono text-zinc-500">
                {apittoIdx + 1}/{candidates.length}
              </span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-center text-xs text-zinc-400">
            Dê uma nota de 0,5 a 5 estrelas para o jogador.
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-amber-400 transition-all"
              style={{ width: `${((apittoIdx + (rating > 0 ? 1 : 0)) / candidates.length) * 100}%` }}
            />
          </div>
          <div
            key={cur.id}
            className="mt-6 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-300"
          >
            <Avatar uid={cur.id} name={cur.name} avatars={avatars} large />
            <p className="text-lg font-bold text-zinc-100">{cur.name}</p>
            <StarRating
              value={rating}
              onChange={(v) => setRatings((r) => ({ ...r, [cur.id]: v }))}
            />
          </div>
          <button
            type="button"
            disabled={!rating}
            onClick={goNext}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--pelada-accent)]/50 bg-[var(--pelada-accent)]/15 px-4 py-3 text-sm font-bold uppercase tracking-wider text-[var(--pelada-accent)] transition hover:bg-[var(--pelada-accent)]/25 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLast ? "Finalizar Avaliações" : (
              <>
                Próximo Jogador <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </DialogContent>
      </Dialog>
    );
  }

  // MVP / Pereba flow (1 or 2 steps)
  const isMvp = step === "mvp";
  const title = isMvp ? "🏆 Quem foi o Craque?" : "🤡 Quem foi o Pereba?";
  const selected = isMvp ? mvp : pereba;
  const setSelected = (id: string) => (isMvp ? setMvp(id) : setPereba(id));
  const accent = isMvp ? "var(--pelada-accent)" : "#ef4444";

  function next() {
    if (isMvp && modes.pereba) setStep("pereba");
    else submitMvpPereba();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto border-white/10 bg-zinc-950 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-center" style={{ color: accent }}>
            {title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-center text-xs text-zinc-400">Selecione um jogador.</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {candidates.map((p) => {
            const isSel = selected === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected(p.id)}
                className={`group flex flex-col items-center gap-2 rounded-xl border bg-zinc-900/60 px-2 py-3 transition ${
                  isSel ? "scale-[1.03]" : "border-white/10 hover:border-white/20"
                }`}
                style={isSel ? { borderColor: accent, boxShadow: `0 0 20px -5px ${accent}99` } : undefined}
              >
                <Avatar uid={p.id} name={p.name} avatars={avatars} large />
                <span className="line-clamp-1 text-center text-xs font-semibold text-zinc-100">{p.name}</span>
                {isSel && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase" style={{ color: accent }}>
                    <Check className="h-3 w-3" /> Selecionado
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          disabled={!selected}
          onClick={next}
          className="mt-5 w-full rounded-xl border px-4 py-3 text-sm font-bold uppercase tracking-wider transition disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ borderColor: `${accent}80`, background: `${accent}26`, color: accent }}
        >
          {isMvp && modes.pereba ? "Próximo" : "Confirmar Voto"}
        </button>
      </DialogContent>
    </Dialog>
  );
}

function Avatar({
  uid,
  name,
  avatars,
  large,
}: {
  uid: string;
  name: string;
  avatars: Record<string, { avatar_url: string | null; full_name: string | null }>;
  large?: boolean;
}) {
  const url = avatars[uid]?.avatar_url ?? null;
  const size = large ? "h-14 w-14" : "h-10 w-10";
  return (
    <div className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-zinc-800`}>
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-xs font-black text-zinc-500">{(name || "?").slice(0, 2).toUpperCase()}</span>
      )}
    </div>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1.5 select-none touch-manipulation">
      {Array.from({ length: 5 }).map((_, i) => {
        const full = i + 1;
        const half = i + 0.5;
        const isFull = value >= full;
        const isHalf = value >= half && value < full;
        return (
          <span key={i} className="relative inline-flex h-12 w-12">
            <button
              type="button"
              aria-label={`${half} estrelas`}
              onClick={() => onChange(half)}
              className="absolute left-0 top-0 z-10 h-full w-1/2"
            />
            <button
              type="button"
              aria-label={`${full} estrelas`}
              onClick={() => onChange(full)}
              className="absolute right-0 top-0 z-10 h-full w-1/2"
            />
            {isFull ? (
              <Star className="h-12 w-12 fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
            ) : isHalf ? (
              <StarHalf className="h-12 w-12 fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
            ) : (
              <Star className="h-12 w-12 text-zinc-700" />
            )}
          </span>
        );
      })}
      <span className="ml-2 w-10 text-right text-base font-mono font-bold tabular-nums text-amber-400">
        {value ? value.toFixed(1) : "—"}
      </span>
    </div>
  );
}