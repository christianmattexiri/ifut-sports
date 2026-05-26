
CREATE OR REPLACE FUNCTION public.is_super_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _uid AND lower(username) IN ('christianmatte','leofreitas')
  );
$$;

CREATE POLICY "Super admins can update any pelada"
ON public.matches
FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete any pelada"
ON public.matches
FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));
