import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PeladaMatch = {
  id: string;
  name: string;
  day_of_week: string | null;
  match_time: string | null;
  location: string | null;
  logo_url: string | null;
  admin_id: string | null;
  is_pro: boolean | null;
  next_match_date: string | null;
  price_player: number | null;
  price_goalkeeper: number | null;
  pix_key: string | null;
  current_draw: unknown | null;
};

export type ViewerProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export const peladaMatchQuery = (id: string | undefined) =>
  queryOptions({
    queryKey: ["pelada-match", id],
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("id, name, day_of_week, match_time, location, logo_url, admin_id, is_pro, next_match_date, price_player, price_goalkeeper, pix_key, current_draw")
        .eq("id", id!)
        .maybeSingle();
      return (data ?? null) as PeladaMatch | null;
    },
  });

export const viewerQuery = () =>
  queryOptions({
    queryKey: ["viewer-profile"],
    // staleTime 0 → ensureQueryData always re-runs the query on the client.
    // Without this an SSR-cached `null` (no session on the server) would
    // make protected pages redirect to "/" right after navigation.
    staleTime: 0,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return null;
      const uid = sess.session.user.id;
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, username, avatar_url")
        .eq("id", uid)
        .maybeSingle();
      return {
        id: uid,
        full_name: prof?.full_name ?? null,
        username: prof?.username ?? null,
        avatar_url: prof?.avatar_url ?? null,
      } as ViewerProfile;
    },
  });

export type AttendanceRow = {
  id: string;
  match_id: string;
  player_id: string | null;
  player_name: string;
  is_goalkeeper: boolean | null;
  has_paid: boolean | null;
  rating: number | null;
  created_at: string | null;
  is_referee: boolean | null;
  is_scorekeeper?: boolean | null;
};

export const matchAttendanceQuery = (id: string | undefined) =>
  queryOptions({
    queryKey: ["match_attendance", id],
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_attendance")
        .select("id, match_id, player_id, player_name, is_goalkeeper, has_paid, rating, created_at, is_referee, is_scorekeeper")
        .eq("match_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AttendanceRow[];
    },
  });

export type MatchRefereeProfile = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export const matchRefereesQuery = (id: string | undefined) =>
  queryOptions({
    queryKey: ["match_referees", id],
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async (): Promise<MatchRefereeProfile[]> => {
      const { data: rows } = await supabase
        .from("match_members")
        .select("user_id, role")
        .eq("match_id", id!)
        .eq("role", "juiz");
      const ids = (rows ?? []).map((r: any) => r.user_id as string);
      if (ids.length === 0) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", ids);
      return ((profs ?? []) as any[]).map((p) => ({
        user_id: p.id,
        full_name: p.full_name ?? null,
        username: p.username ?? null,
        avatar_url: p.avatar_url ?? null,
      }));
    },
  });
