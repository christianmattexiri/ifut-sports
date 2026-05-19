
-- 1) Add settings JSONB to matches (cloud-synced admin settings).
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2) Cloud-synced voting status per game.
CREATE TABLE IF NOT EXISTS public.game_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id uuid NOT NULL,
  voter_id uuid NOT NULL,
  mvp_id uuid NULL,
  pereba_id uuid NULL,
  apitto_ratings jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, voter_id)
);

CREATE INDEX IF NOT EXISTS game_votes_game_id_idx ON public.game_votes(game_id);

ALTER TABLE public.game_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer um vê os votos" ON public.game_votes;
CREATE POLICY "Qualquer um vê os votos"
  ON public.game_votes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Usuário insere o próprio voto" ON public.game_votes;
CREATE POLICY "Usuário insere o próprio voto"
  ON public.game_votes FOR INSERT
  WITH CHECK (auth.uid() = voter_id);

DROP POLICY IF EXISTS "Usuário atualiza o próprio voto" ON public.game_votes;
CREATE POLICY "Usuário atualiza o próprio voto"
  ON public.game_votes FOR UPDATE
  USING (auth.uid() = voter_id);

DROP POLICY IF EXISTS "Usuário deleta o próprio voto" ON public.game_votes;
CREATE POLICY "Usuário deleta o próprio voto"
  ON public.game_votes FOR DELETE
  USING (auth.uid() = voter_id);

-- updated_at trigger
DROP TRIGGER IF EXISTS set_updated_at_on_game_votes ON public.game_votes;
CREATE TRIGGER set_updated_at_on_game_votes
  BEFORE UPDATE ON public.game_votes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
