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
};

export type ViewerProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
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
        .select("id, name, day_of_week, match_time, location, logo_url, admin_id, is_pro")
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
        .select("full_name, username")
        .eq("id", uid)
        .maybeSingle();
      return {
        id: uid,
        full_name: prof?.full_name ?? null,
        username: prof?.username ?? null,
      } as ViewerProfile;
    },
  });
