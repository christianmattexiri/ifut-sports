import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, Skull, Star, StarHalf, Check } from "lucide-react";
import { useAvatars } from "@/lib/avatars";
import {
  loadVotes,
  saveVotes,
  type MatchVotes,
} from "@/lib/voting";

type Player = { id: string; name: string };
type Modes = { mvp: boolean; pereba: boolean; apitto: boolean };

export function VotingModal({
  open,
  onOpenChange,
  peladaId,
  histId,
  voterId,
  players,
  modes,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  peladaId: string;
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

  const [step, setStep] = useState<"mvp" | "pereba" | "apitto">(
    modes.apitto ? "apitto" : modes.mvp ? "mvp" : "pereba",
  );
  const [mvp, setMvp] = useState<string | null>(null);
  const [pereba, setPereba] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});

  function persistAndClose(updater: (v: MatchVotes) => MatchVotes) {
    const cur = loadVotes(peladaId, histId);
    const next = updater(cur);
    saveVotes(peladaId, histId, next);
    onOpenChange(false);
  }

  function submitMvpPereba() {
    persistAndClose((v) => {
      const out = { ...v, mvpVotes: { ...v.mvpVotes }, perebaVotes: { ...v.perebaVotes } };
      if (modes.mvp && mvp) out.mvpVotes[voterId] = mvp;
      if (modes.pereba && pereba) out.perebaVotes[voterId] = pereba;
      return out;
    });
  }

  function submitApitto() {
    persistAndClose((v) => ({
      ...v,
      apitto: { ...v.apitto, [voterId]: ratings },
    }));
  }

  if (modes.apitto) {
    const allRated = candidates.every((p) => (ratings[p.id] ?? 0) > 0);
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto border-white/10 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-amber-400 text-center">⭐ Avalie a Galera</DialogTitle>
          </DialogHeader>
          <p className="text-center text-xs text-zinc-400">Dê uma nota de 0,5 a 5 estrelas para cada jogador.</p>
          <ul className="mt-4 space-y-2">
            {candidates.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5">
                <Avatar uid={p.id} name={p.name} avatars={avatars} />
                <span className="flex-1 text-sm font-medium text-zinc-100">{p.name}</span>
                <StarRating value={ratings[p.id] ?? 0} onChange={(v) => setRatings((r) => ({ ...r, [p.id]: v }))} />
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={!allRated}
            onClick={submitApitto}
            className="mt-5 w-full rounded-xl border border-[#00FF00]/50 bg-[#00FF00]/15 px-4 py-3 text-sm font-bold uppercase tracking-wider text-[#00FF00] transition hover:bg-[#00FF00]/25 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Enviar Notas
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
  const accent = isMvp ? "#00FF00" : "#ef4444";

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
  // 10 half-steps from 0.5..5
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const full = i + 1;
        const half = i + 0.5;
        const isFull = value >= full;
        const isHalf = value >= half && value < full;
        return (
          <span key={i} className="relative inline-flex h-5 w-5">
            <button
              type="button"
              aria-label={`${half} estrelas`}
              onClick={() => onChange(half)}
              className="absolute left-0 top-0 z-10 h-5 w-1/2"
            />
            <button
              type="button"
              aria-label={`${full} estrelas`}
              onClick={() => onChange(full)}
              className="absolute right-0 top-0 z-10 h-5 w-1/2"
            />
            {isFull ? (
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            ) : isHalf ? (
              <StarHalf className="h-5 w-5 fill-amber-400 text-amber-400" />
            ) : (
              <Star className="h-5 w-5 text-zinc-600" />
            )}
          </span>
        );
      })}
      <span className="ml-1 w-7 text-right text-[11px] font-mono tabular-nums text-amber-400">
        {value ? value.toFixed(1) : "—"}
      </span>
    </div>
  );
}