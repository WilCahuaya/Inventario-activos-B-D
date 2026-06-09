-- Admin entidad: puede actualizar ambientes de su entidad (no eliminar)
DROP POLICY IF EXISTS ambientes_update_admin ON public.ambientes;
CREATE POLICY ambientes_update_admin ON public.ambientes FOR UPDATE TO authenticated
  USING (
    public.is_contador()
    OR (
      public.my_entidad_id() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.sedes s
        WHERE s.id = sede_id AND s.entidad_id = public.my_entidad_id()
      )
    )
  )
  WITH CHECK (
    public.is_contador()
    OR (
      public.my_entidad_id() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.sedes s
        WHERE s.id = sede_id AND s.entidad_id = public.my_entidad_id()
      )
    )
  );
