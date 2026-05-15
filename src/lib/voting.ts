// Pós-jogo voting state, persisted to localStorage per match (histMatch.id).
// TODO: Criar cron job no Supabase Edge Functions para encerrar votação em 24h automaticamente.

export type ApittoMap = Record<string, Record<string, number>>;
// voterId -> candidateId -> rating (0.5..5)

export type MatchVotes = {
  mvpVotes: Record<string, string>; // voterId -> candidateId
  perebaVotes: Record<string, string>;
  apitto: ApittoMap;
  closed: boolean;
  closedAt?: string;
};

const empty: MatchVotes = {
  mvpVotes: {},
  perebaVotes: {},
  apitto: {},
  closed: false,
};

const key = (peladaId: string, histId: string) =>
  `pelada:${peladaId}:votes:${histId}`;

export function loadVotes(peladaId: string, histId: string): MatchVotes {
  if (typeof window === "undefined") return { ...empty };
  try {
    const raw = localStorage.getItem(key(peladaId, histId));
    if (!raw) return { ...empty };
    return { ...empty, ...JSON.parse(raw) };
  } catch {
    return { ...empty };
  }
}

export function saveVotes(peladaId: string, histId: string, v: MatchVotes) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key(peladaId, histId), JSON.stringify(v));
  // notify same-tab listeners
  window.dispatchEvent(new CustomEvent("ifut:votes-updated", { detail: { peladaId, histId } }));
}

export function userHasVoted(
  v: MatchVotes,
  uid: string,
  modes: { mvp: boolean; pereba: boolean; apitto: boolean },
): boolean {
  if (modes.apitto) return !!v.apitto[uid] && Object.keys(v.apitto[uid]).length > 0;
  let ok = true;
  if (modes.mvp) ok = ok && !!v.mvpVotes[uid];
  if (modes.pereba) ok = ok && !!v.perebaVotes[uid];
  return ok;
}

export function computeWinner(map: Record<string, string>): { id: string | null; count: number } {
  const tally: Record<string, number> = {};
  for (const cand of Object.values(map)) tally[cand] = (tally[cand] ?? 0) + 1;
  let id: string | null = null;
  let count = 0;
  for (const [k, c] of Object.entries(tally)) {
    if (c > count) { id = k; count = c; }
  }
  return { id, count };
}

export function computeApitto(v: ApittoMap): { id: string; avg: number; n: number }[] {
  const totals: Record<string, { sum: number; n: number }> = {};
  for (const ratings of Object.values(v)) {
    for (const [pid, val] of Object.entries(ratings)) {
      if (!totals[pid]) totals[pid] = { sum: 0, n: 0 };
      totals[pid].sum += val;
      totals[pid].n += 1;
    }
  }
  return Object.entries(totals)
    .map(([id, t]) => ({ id, avg: t.n ? t.sum / t.n : 0, n: t.n }))
    .sort((a, b) => b.avg - a.avg);
}

// Returns true if the current leader of a vote map cannot be caught
// by the runner-up given the remaining (not yet cast) ballots.
// Formula: leader > runnerUp + remaining
export function isLeaderMathLocked(
  map: Record<string, string>,
  totalEligibleVoters: number,
): boolean {
  const tally: Record<string, number> = {};
  for (const cand of Object.values(map)) tally[cand] = (tally[cand] ?? 0) + 1;
  const counts = Object.values(tally).sort((a, b) => b - a);
  const leader = counts[0] ?? 0;
  const runner = counts[1] ?? 0;
  const cast = Object.keys(map).length;
  const remaining = Math.max(0, totalEligibleVoters - cast);
  return leader > 0 && leader > runner + remaining;
}

export function onVotesUpdated(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const h = () => cb();
  window.addEventListener("ifut:votes-updated", h);
  const s = (e: StorageEvent) => { if (e.key && e.key.includes(":votes:")) cb(); };
  window.addEventListener("storage", s);
  return () => {
    window.removeEventListener("ifut:votes-updated", h);
    window.removeEventListener("storage", s);
  };
}