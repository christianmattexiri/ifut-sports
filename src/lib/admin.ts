// Username of the global super admin who can manage any pelada
// regardless of being its match.admin_id.
export const SUPER_ADMIN_USERNAME = "christianmatte";

export function isSuperAdminUsername(username?: string | null): boolean {
  return (username ?? "").toLowerCase() === SUPER_ADMIN_USERNAME;
}
