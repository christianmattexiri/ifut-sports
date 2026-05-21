// Usernames of global super admins who can manage any pelada
// regardless of being its match.admin_id.
export const SUPER_ADMIN_USERNAMES = ["christianmatte", "cardosogenuino"] as const;

// Backwards-compat export (first entry).
export const SUPER_ADMIN_USERNAME = SUPER_ADMIN_USERNAMES[0];

export function isSuperAdminUsername(username?: string | null): boolean {
  const u = (username ?? "").toLowerCase();
  return SUPER_ADMIN_USERNAMES.includes(u as (typeof SUPER_ADMIN_USERNAMES)[number]);
}
