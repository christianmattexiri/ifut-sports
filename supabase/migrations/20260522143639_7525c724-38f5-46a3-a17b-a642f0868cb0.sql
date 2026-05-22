ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS next_match_date date,
  ADD COLUMN IF NOT EXISTS price_player numeric(10,2),
  ADD COLUMN IF NOT EXISTS price_goalkeeper numeric(10,2),
  ADD COLUMN IF NOT EXISTS pix_key text;