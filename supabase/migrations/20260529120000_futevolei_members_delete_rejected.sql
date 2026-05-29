-- Allow students to remove rejected (or pending) memberships before requesting a new instructor.
DROP POLICY IF EXISTS "members student delete pending" ON public.futevolei_members;

CREATE POLICY "members student delete own pending rejected" ON public.futevolei_members
  FOR DELETE TO authenticated
  USING (auth.uid() = student_id AND status IN ('pending', 'rejected'));
