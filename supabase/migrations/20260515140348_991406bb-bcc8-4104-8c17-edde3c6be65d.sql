CREATE OR REPLACE FUNCTION public.get_match_member_counts(match_ids uuid[])
RETURNS TABLE(match_id uuid, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Total = 1 (admin) + count of match_members rows
  SELECT m.id AS match_id,
         1::bigint + COALESCE((
           SELECT COUNT(*) FROM public.match_members mm WHERE mm.match_id = m.id
         ), 0) AS total
  FROM public.matches m
  WHERE m.id = ANY(match_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_match_member_counts(uuid[]) TO authenticated, anon;