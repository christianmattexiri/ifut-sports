-- Instrutor pode remover vínculos com seus alunos (quebra o membership).
CREATE POLICY "members instructor delete" ON public.futevolei_members
  FOR DELETE TO authenticated
  USING (auth.uid() = instructor_id);
