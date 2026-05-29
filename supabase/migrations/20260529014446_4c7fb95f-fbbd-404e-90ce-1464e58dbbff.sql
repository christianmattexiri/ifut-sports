CREATE TABLE public.futevolei_instructors (
  user_id uuid PRIMARY KEY,
  nome text NOT NULL,
  apelido text,
  idade int CHECK (idade BETWEEN 5 AND 99),
  local_aula text,
  invite_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.futevolei_students (
  user_id uuid PRIMARY KEY,
  nome text NOT NULL,
  apelido text,
  idade int CHECK (idade BETWEEN 5 AND 99),
  perna_dominante text CHECK (perna_dominante IN ('destra','canhota','ambidestra')),
  nivel_atual text NOT NULL DEFAULT 'iniciante',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.futevolei_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL,
  student_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instructor_id, student_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.futevolei_instructors TO authenticated;
GRANT ALL ON public.futevolei_instructors TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.futevolei_students TO authenticated;
GRANT ALL ON public.futevolei_students TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.futevolei_members TO authenticated;
GRANT ALL ON public.futevolei_members TO service_role;

ALTER TABLE public.futevolei_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.futevolei_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.futevolei_members ENABLE ROW LEVEL SECURITY;

-- instructors policies
CREATE POLICY "instructor select own" ON public.futevolei_instructors
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "instructor insert own" ON public.futevolei_instructors
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "instructor update own" ON public.futevolei_instructors
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "instructor visible to linked students" ON public.futevolei_instructors
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.futevolei_members m
      WHERE m.instructor_id = futevolei_instructors.user_id
        AND m.student_id = auth.uid()
    )
  );

-- students policies
CREATE POLICY "student select own" ON public.futevolei_students
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "student insert own" ON public.futevolei_students
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "student update own" ON public.futevolei_students
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "student visible to linked instructor" ON public.futevolei_students
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.futevolei_members m
      WHERE m.student_id = futevolei_students.user_id
        AND m.instructor_id = auth.uid()
    )
  );

-- members policies
CREATE POLICY "members student select" ON public.futevolei_members
  FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "members instructor select" ON public.futevolei_members
  FOR SELECT TO authenticated USING (auth.uid() = instructor_id);
CREATE POLICY "members student insert" ON public.futevolei_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id AND status = 'pending');
CREATE POLICY "members instructor update" ON public.futevolei_members
  FOR UPDATE TO authenticated USING (auth.uid() = instructor_id) WITH CHECK (auth.uid() = instructor_id);
CREATE POLICY "members student delete pending" ON public.futevolei_members
  FOR DELETE TO authenticated USING (auth.uid() = student_id AND status = 'pending');

-- triggers
CREATE TRIGGER trg_fv_instructors_updated BEFORE UPDATE ON public.futevolei_instructors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_fv_students_updated BEFORE UPDATE ON public.futevolei_students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_fv_members_updated BEFORE UPDATE ON public.futevolei_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- functions
CREATE OR REPLACE FUNCTION public.gen_futevolei_invite_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
  exists_already boolean;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, 1 + floor(random()*length(chars))::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.futevolei_instructors WHERE invite_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.lookup_futevolei_instructor_by_code(_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.futevolei_instructors WHERE invite_code = upper(_code) LIMIT 1;
$$;