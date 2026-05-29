-- Allow students to re-apply after rejection (rejected → pending) on the same instructor pair.
CREATE POLICY "members student update reapply" ON public.futevolei_members
  FOR UPDATE TO authenticated
  USING (auth.uid() = student_id AND status = 'rejected')
  WITH CHECK (auth.uid() = student_id AND status = 'pending');
