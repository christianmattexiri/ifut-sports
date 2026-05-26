-- 1) Novas colunas de perfil
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_draws integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_losses integer NOT NULL DEFAULT 0;

-- 2) Marcador idempotente em games
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS profiles_synced boolean NOT NULL DEFAULT false;

-- 3) Backfill da última partida (8x10, time B venceu) — soma gols/assists/V/D/empates
--    e incrementa total_matches.
WITH g AS (
  SELECT id, score_a, score_b
  FROM public.games
  WHERE id = '56979f0a-7aa5-4217-b4e5-2e1615ed5bd1'
),
deltas AS (
  SELECT
    s.user_id,
    COALESCE(s.goals, 0)   AS d_goals,
    COALESCE(s.assists, 0) AS d_assists,
    CASE WHEN (s.team = 'A' AND g.score_a > g.score_b)
           OR (s.team = 'B' AND g.score_b > g.score_a) THEN 1 ELSE 0 END AS d_win,
    CASE WHEN (s.team = 'A' AND g.score_a < g.score_b)
           OR (s.team = 'B' AND g.score_b < g.score_a) THEN 1 ELSE 0 END AS d_loss,
    CASE WHEN g.score_a = g.score_b THEN 1 ELSE 0 END AS d_draw
  FROM public.game_player_stats s
  JOIN g ON g.id = s.game_id
)
UPDATE public.profiles p
SET
  total_goals    = COALESCE(p.total_goals, 0)    + d.d_goals,
  total_assists  = COALESCE(p.total_assists, 0)  + d.d_assists,
  total_wins     = COALESCE(p.total_wins, 0)     + d.d_win,
  total_losses   = COALESCE(p.total_losses, 0)   + d.d_loss,
  total_draws    = COALESCE(p.total_draws, 0)    + d.d_draw,
  total_matches  = COALESCE(p.total_matches, 0)  + 1
FROM deltas d
WHERE p.id = d.user_id;

-- 4) Marca partida como já sincronizada para evitar dupla contagem
UPDATE public.games
SET profiles_synced = true
WHERE id = '56979f0a-7aa5-4217-b4e5-2e1615ed5bd1';

-- 5) Ajuste fino: +1 vitória no perfil do Tiago Atanasoff
UPDATE public.profiles
SET total_wins = COALESCE(total_wins, 0) + 1
WHERE email ILIKE 'tiagoatanasoff@%';