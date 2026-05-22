ALTER TABLE public.match_members
  ADD COLUMN IF NOT EXISTS rating numeric NOT NULL DEFAULT 5;

ALTER TABLE public.match_members
  DROP CONSTRAINT IF EXISTS match_members_rating_range;
ALTER TABLE public.match_members
  ADD CONSTRAINT match_members_rating_range CHECK (rating >= 1 AND rating <= 10);

DROP POLICY IF EXISTS "Admin pode atualizar membros da sua pelada" ON public.match_members;
CREATE POLICY "Admin pode atualizar membros da sua pelada"
  ON public.match_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_members.match_id AND m.admin_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_members.match_id AND m.admin_id = auth.uid()
    )
  );