-- Add role column to match_members
ALTER TABLE public.match_members
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'player';

ALTER TABLE public.match_members
  DROP CONSTRAINT IF EXISTS match_members_role_check;
ALTER TABLE public.match_members
  ADD CONSTRAINT match_members_role_check CHECK (role IN ('player', 'juiz'));

-- Add is_referee column to match_attendance
ALTER TABLE public.match_attendance
  ADD COLUMN IF NOT EXISTS is_referee boolean NOT NULL DEFAULT false;