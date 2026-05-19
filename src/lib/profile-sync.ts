// Lightweight in-app pub/sub for profile updates so name/avatar changes
// reflect across all open pages without a reload.
export type ProfileUpdate = {
  userId: string;
  full_name?: string | null;
  avatar_url?: string | null;
};

const EVT = "ifut:profile-updated";
const STATS_EVT = "ifut:stats-updated";

export function emitProfileUpdate(detail: ProfileUpdate) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ProfileUpdate>(EVT, { detail }));
}

export function onProfileUpdate(cb: (u: ProfileUpdate) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => cb((e as CustomEvent<ProfileUpdate>).detail);
  window.addEventListener(EVT, handler);
  return () => window.removeEventListener(EVT, handler);
}

// Dispara quando uma partida tem MVP/Pereba/scores atualizados na nuvem,
// para que Rankings/Perfil possam reagregar imediatamente sem reload.
export function emitStatsUpdated(matchId?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STATS_EVT, { detail: { matchId } }));
}

export function onStatsUpdated(cb: (detail: { matchId?: string }) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => cb((e as CustomEvent<{ matchId?: string }>).detail);
  window.addEventListener(STATS_EVT, handler);
  return () => window.removeEventListener(STATS_EVT, handler);
}
