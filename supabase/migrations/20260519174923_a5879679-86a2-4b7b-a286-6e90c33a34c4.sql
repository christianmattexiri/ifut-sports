-- Add columns needed to persist per-game player stats with guest names and goalkeeper flag.
ALTER TABLE public.game_player_stats
  ADD COLUMN IF NOT EXISTS player_name text,
  ADD COLUMN IF NOT EXISTS assists_count integer; -- noop reserved

-- Drop placeholder column if accidentally added
ALTER TABLE public.game_player_stats DROP COLUMN IF EXISTS assists_count;

-- Index for fast lookup by game.
CREATE INDEX IF NOT EXISTS idx_game_player_stats_game_id ON public.game_player_stats(game_id);
CREATE INDEX IF NOT EXISTS idx_games_match_id_date ON public.games(match_id, game_date DESC, created_at DESC);

-- Ensure unique constraint (one stat row per player per game).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_player_stats_game_user_unique'
  ) THEN
    ALTER TABLE public.game_player_stats
      ADD CONSTRAINT game_player_stats_game_user_unique UNIQUE (game_id, user_id);
  END IF;
END$$;