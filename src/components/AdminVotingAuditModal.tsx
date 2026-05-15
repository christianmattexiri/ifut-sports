import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Lock, Crown, Skull, Star } from "lucide-react";
import type { MatchVotes } from "@/lib/voting";

type Player = { id: string; name: string };
type Modes = { mvp: boolean; pereba: boolean; apitto: boolean };

export function AdminVotingAuditModal({
  open,
  onOpenChange,
  votes,
  players,
  validVoterIds,
  modes,
  onForceClose,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  votes: MatchVotes | null;
  players: Player[];
  validVoterIds: string[];
  modes: Modes;
  onForceClose: () => void;
}) {
  const byId = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of players) m[p.id] = p.name;
    return m;
  }, [players]);

  const validSet = useMemo(() => new Set(validVoterIds), [validVoterIds]);

  const cast = useMemo(() => {
    if (!votes) return [] as { voter: string; target: string; mode: "mvp" | "pereba" | "apitto" }[];
    const out: { voter: string; target: string; mode: "mvp" | "pereba" | "apitto" }[] = [];
    if (modes.mvp) {
      for (const [voter, target] of Object.entries(votes.mvpVotes)) {
        if (validSet.has(voter)) out.push({ voter, target, mode: "mvp" });
      }
    }
    if (modes.pereba) {
      for (const [voter, target] of Object.entries(votes.perebaVotes)) {
        if (validSet.has(voter)) out.push({ voter, target, mode: "pereba" });
      }
    }
    if (modes.apitto) {
      for (const voter of Object.keys(votes.apitto)) {
        if (validSet.has(voter)) out.push({ voter, target: "—", mode: "apitto" });
      }
    }
    return out;
  }, [votes, validSet, modes]);

  const votedSet = useMemo(() => {
    const s = new Set<string>();
    if (!votes) return s;
    if (modes.apitto) {
      for (const v of Object.keys(votes.apitto)) {
        if (Object.keys(votes.apitto[v] ?? {}).length > 0) s.add(v);
      }
    } else {
      for (const v of validVoterIds) {
        const okMvp = !modes.mvp || !!votes.mvpVotes[v];
        const okPer = !modes.pereba || !!votes.perebaVotes[v];
        if (okMvp && okPer) s.add(v);
      }
    }
    return s;
  }, [votes, modes, validVoterIds]);

  const missing = validVoterIds.filter((id) => !votedSet.has(id));

  const modeIcon = (m: "mvp" | "pereba" | "apitto") =>
    m === "mvp" ? <Crown className="h-3.5 w-3.5 text-[#00FF00]" />
    : m === "pereba" ? <Skull className="h-3.5 w-3.5 text-red-400" />
    : <Star className="h-3.5 w-3.5 text-amber-400" />;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-amber-400/40 bg-zinc-950 text-zinc-100 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-300">
            <Eye className="h-5 w-5" /> ADMIN — Auditoria da Votação
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-zinc-900/50 px-3 py-2 text-center text-xs">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Votaram</p>
            <p className="text-lg font-black text-[#00FF00]">{votedSet.size}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Faltam</p>
            <p className="text-lg font-black text-amber-300">{missing.length}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Elegíveis</p>
            <p className="text-lg font-black text-zinc-200">{validVoterIds.length}</p>
          </div>
        </div>

        <section className="mt-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
            Quem votou ({cast.length})
          </h3>
          {cast.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhum voto registrado ainda.</p>
          ) : (
            <ul className="space-y-1.5">
              {cast.map((c, i) => (
                <li
                  key={`${c.voter}-${c.mode}-${i}`}
                  className="flex items-center gap-2 rounded-md border border-white/5 bg-zinc-900/50 px-3 py-1.5 text-sm"
                >
                  {modeIcon(c.mode)}
                  <span className="text-zinc-400">{byId[c.voter] ?? "—"}</span>
                  <span className="text-zinc-600">→</span>
                  <span className="font-semibold text-white">{byId[c.target] ?? c.target}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
            Quem falta votar ({missing.length})
          </h3>
          {missing.length === 0 ? (
            <p className="text-sm text-[#00FF00]">✓ Todos votaram.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {missing.map((id) => (
                <span
                  key={id}
                  className="rounded-md border border-amber-400/30 bg-amber-400/5 px-2 py-1 text-xs font-medium text-amber-200"
                >
                  {byId[id] ?? "—"}
                </span>
              ))}
            </div>
          )}
        </section>

        {!votes?.closed && (
          <button
            type="button"
            onClick={() => {
              onForceClose();
              onOpenChange(false);
            }}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-red-300 transition hover:bg-red-500/20"
          >
            <Lock className="h-4 w-4" /> Encerrar Votação (Admin)
          </button>
        )}
        {votes?.closed && (
          <p className="mt-5 text-center text-xs text-zinc-500">
            <Lock className="mr-1 inline h-3 w-3" /> Votação encerrada.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}