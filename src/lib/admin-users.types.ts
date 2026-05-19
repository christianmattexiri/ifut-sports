export type AdminUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  peladas: { id: string; name: string; role: "admin" | "member" }[];
};