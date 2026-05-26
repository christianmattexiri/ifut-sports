ALTER TABLE public.game_player_stats ADD COLUMN IF NOT EXISTS own_goals integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_own_goals integer NOT NULL DEFAULT 0;