import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, StarHalf, Crown, Skull } from "lucide-react";
import { useAvatars } from "@/lib/avatars";
import { computeApitto, type MatchVotes } from "@/lib/voting";
import { PlayerProfileModal } from "@/components/PlayerProfileModal";

export function ApittoResultsModal({
  open,
  onOpenChange,
  peladaId,
  players,
  votes,
  refereeIds = [],
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  peladaId: string;
  histId?: string;
  players: { id: string; name: string }[];
  votes: MatchVotes | null;
  refereeIds?: string[];
}) {
  const ranked = useMemo(() => {
    if (!open || !votes) return [];
    const byId = new Map(players.map((p) => [p.id, p]));
    return computeApitto(votes.apitto, refereeIds)
      .filter((r) => byId.has(r.id))
      .map((r) => ({ ...r, name: byId.get(r.id)!.name }));
  }, [open, votes, players, refereeIds]);
  const avatars = useAvatars(ranked.map((r) => r.id));
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto border-white/10 bg-zinc-950 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-center text-amber-400">⭐ Notas da Galera</DialogTitle>
        </DialogHeader>
        {ranked.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">Ainda sem votos.</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {ranked.map((r, i) => {
              const isFirst = i === 0;
              const isLast = i === ranked.length - 1 && ranked.length > 1;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => { setPicked({ id: r.id, name: r.name }); onOpenChange(false); }}
                    className={`flex w-full items-center gap-3 rounded-xl border bg-zinc-900/60 px-3 py-2 text-left transition hover:bg-zinc-900 hover:border-white/20 ${
                      isFirst ? "border-amber-400/50 shadow-[0_0_18px_-6px_rgba(251,191,36,0.6)]" :
                      isLast ? "border-red-500/40" : "border-white/10"
                    }`}
                  >
                    <span className="w-6 text-center font-mono text-sm font-black text-amber-400">{i + 1}º</span>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-zinc-800">
                      {avatars[r.id]?.avatar_url ? (
                        <img src={avatars[r.id].avatar_url!} alt={r.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-black text-zinc-500">{r.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex flex-1 items-center gap-1.5 min-w-0">
                      <span className="truncate text-sm font-semibold text-zinc-100">{r.name}</span>
                      {isFirst && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-black uppercase text-amber-400">
                          <Crown className="h-3 w-3" /> MVP
                        </span>
                      )}
                      {isLast && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-500/15 px-1.5 py-0.5 text-[10px] font-black uppercase text-red-400">
                          <Skull className="h-3 w-3" /> Pereba
                        </span>
                      )}
                    </div>
                    <StarsRO value={r.avg} />
                    <span className="w-10 text-right font-mono text-sm font-black tabular-nums text-amber-400">
                      {r.avg.toFixed(1)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </DialogContent>
    </Dialog>
    <PlayerProfileModal
      open={!!picked}
      onOpenChange={(o) => !o && setPicked(null)}
      matchId={peladaId}
      userId={picked?.id ?? null}
      fallbackName={picked?.name}
    />
    </>
  );
}

function StarsRO({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const full = value >= i + 1;
        const half = !full && value >= i + 0.5;
        return full ? (
          <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        ) : half ? (
          <StarHalf key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        ) : (
          <Star key={i} className="h-3.5 w-3.5 text-zinc-600" />
        );
      })}
    </span>
  );
}