-- Permitir eliminar responsables (sin ambientes asignados; validado en la app)

DROP POLICY IF EXISTS responsables_delete ON public.responsables;
CREATE POLICY responsables_delete ON public.responsables
  FOR DELETE TO authenticated
  USING (public.can_access_entidad(entidad_id));

GRANT DELETE ON public.responsables TO authenticated;
