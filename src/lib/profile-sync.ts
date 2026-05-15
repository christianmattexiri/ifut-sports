// Lightweight in-app pub/sub for profile updates so name/avatar changes
// reflect across all open pages without a reload.
export type ProfileUpdate = {
  userId: string;
  full_name?: string | null;
  avatar_url?: string | null;
};

const EVT = "ifut:profile-updated";

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
