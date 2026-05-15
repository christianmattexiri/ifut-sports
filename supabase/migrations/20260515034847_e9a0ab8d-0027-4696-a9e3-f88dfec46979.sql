-- 1) Tabela de membros da pelada
CREATE TABLE IF NOT EXISTS public.match_members (
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, user_id)
);

CREATE INDEX IF NOT EXISTS match_members_user_idx ON public.match_members(user_id);
CREATE INDEX IF NOT EXISTS match_members_match_idx ON public.match_members(match_id);

ALTER TABLE public.match_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê suas próprias participações"
  ON public.match_members FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin da pelada vê todos os membros"
  ON public.match_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND m.admin_id = auth.uid()
  ));

CREATE POLICY "Usuário pode entrar em pelada (somente a si mesmo)"
  ON public.match_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin pode remover membros da sua pelada"
  ON public.match_members FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND m.admin_id = auth.uid()
  ));

CREATE POLICY "Usuário pode sair da pelada"
  ON public.match_members FOR DELETE
  USING (auth.uid() = user_id);

-- 2) Permitir que o admin da pelada veja os convites que enviou
CREATE POLICY "Admin da pelada vê convites enviados"
  ON public.match_invitations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND m.admin_id = auth.uid()
  ));