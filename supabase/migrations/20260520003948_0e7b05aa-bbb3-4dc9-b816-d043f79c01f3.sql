ALTER TABLE public.match_attendance
ADD COLUMN IF NOT EXISTS rating numeric DEFAULT 5;

UPDATE public.match_attendance
SET rating = 5
WHERE rating IS NULL;