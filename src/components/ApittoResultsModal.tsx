import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, StarHalf } from "lucide-react";
import { useAvatars } from "@/lib/avatars";
import { computeApitto, loadVotes } from "@/lib/voting";

export function ApittoResultsModal({
  open,
  onOpenChange,
  peladaId,
  histId,
  players,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  peladaId: string;
  histId: string;
  players: { id: string; name: string }[];
}) {
  const ranked = useMemo(() => {
    if (!open) return [];
    const v = loadVotes(peladaId, histId);
    const byId = new Map(players.map((p) => [p.id, p]));
    return computeApitto(v.apitto)
      .filter((r) => byId.has(r.id))
      .map((r) => ({ ...r, name: byId.get(r.id)!.name }));
  }, [open, peladaId, histId, players]);
  const avatars = useAvatars(ranked.map((r) => r.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto border-white/10 bg-zinc-950 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-center text-amber-400">⭐ Notas da Galera</DialogTitle>
        </DialogHeader>
        {ranked.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">Ainda sem votos.</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {ranked.map((r, i) => (
              <li key={r.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2">
                <span className="w-6 text-center font-mono text-sm font-black text-amber-400">{i + 1}º</span>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-zinc-800">
                  {avatars[r.id]?.avatar_url ? (
                    <img src={avatars[r.id].avatar_url!} alt={r.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-black text-zinc-500">{r.name.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <span className="flex-1 text-sm font-semibold text-zinc-100">{r.name}</span>
                <StarsRO value={r.avg} />
                <span className="w-10 text-right font-mono text-sm font-black tabular-nums text-amber-400">
                  {r.avg.toFixed(1)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
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