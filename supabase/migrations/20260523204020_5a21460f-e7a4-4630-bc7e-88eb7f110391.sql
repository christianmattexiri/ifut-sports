ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_matches integer,
  ADD COLUMN IF NOT EXISTS total_assists integer,
  ADD COLUMN IF NOT EXISTS total_perebas integer;