-- Fase 2: contador puede crear perfiles de administradores de entidad
DROP POLICY IF EXISTS profiles_insert_contador ON public.profiles;
CREATE POLICY profiles_insert_contador ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_contador());
