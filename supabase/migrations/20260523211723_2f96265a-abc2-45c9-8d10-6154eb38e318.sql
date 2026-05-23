
-- 1) profiles: stop exposing emails to anon. Drop the broad public policy.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

-- Authenticated users can view all profiles (needed for rankings, lists, etc.)
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 2) matches: restrict SELECT to authenticated users to protect pix_key
DROP POLICY IF EXISTS "Qualquer um pode ver as peladas" ON public.matches;
CREATE POLICY "Peladas viewable by authenticated"
ON public.matches FOR SELECT
TO authenticated
USING (true);

-- 3) games: require authenticated for writes
DROP POLICY IF EXISTS "Qualquer usuário logado pode inserir jogos" ON public.games;
DROP POLICY IF EXISTS "Qualquer usuário logado pode atualizar jogos" ON public.games;
DROP POLICY IF EXISTS "Qualquer usuário logado pode deletar jogos" ON public.games;

CREATE POLICY "Authenticated insert games"
ON public.games FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update games"
ON public.games FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete games"
ON public.games FOR DELETE TO authenticated USING (true);

-- 4) game_player_stats: require authenticated for writes
DROP POLICY IF EXISTS "Qualquer usuário logado pode inserir stats" ON public.game_player_stats;
DROP POLICY IF EXISTS "Qualquer usuário logado pode atualizar stats" ON public.game_player_stats;
DROP POLICY IF EXISTS "Qualquer usuário logado pode deletar stats" ON public.game_player_stats;

CREATE POLICY "Authenticated insert stats"
ON public.game_player_stats FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update stats"
ON public.game_player_stats FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete stats"
ON public.game_player_stats FOR DELETE TO authenticated USING (true);

-- 5) match_attendance: require authenticated for writes
DROP POLICY IF EXISTS "Qualquer um insere na lista de presença" ON public.match_attendance;
DROP POLICY IF EXISTS "Qualquer um atualiza a lista de presença" ON public.match_attendance;
DROP POLICY IF EXISTS "Qualquer um deleta da lista de presença" ON public.match_attendance;

CREATE POLICY "Authenticated insert attendance"
ON public.match_attendance FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update attendance"
ON public.match_attendance FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete attendance"
ON public.match_attendance FOR DELETE TO authenticated USING (true);

-- 6) match_invitations: only the pelada admin can send invitations
DROP POLICY IF EXISTS "Admins de pelada podem enviar convites" ON public.match_invitations;
CREATE POLICY "Admins de pelada podem enviar convites"
ON public.match_invitations FOR INSERT
TO authenticated
WITH CHECK (
  inviter_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_invitations.match_id AND m.admin_id = auth.uid()
  )
);

-- 7) Revoke anon EXECUTE on SECURITY DEFINER helper that only signed-in users need
REVOKE EXECUTE ON FUNCTION public.get_match_member_counts(uuid[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_match_member_counts(uuid[]) TO authenticated;
