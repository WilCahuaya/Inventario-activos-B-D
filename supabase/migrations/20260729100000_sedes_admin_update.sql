-- Admin de entidad puede actualizar/desactivar sedes de su propia entidad.
-- (INSERT ya permitido vía sedes_insert_admin; UPDATE/DELETE eran solo contador.)

DROP POLICY IF EXISTS sedes_update ON public.sedes;
CREATE POLICY sedes_update ON public.sedes FOR UPDATE TO authenticated
  USING (
    public.is_contador()
    OR public.my_entidad_id() = entidad_id
  )
  WITH CHECK (
    public.is_contador()
    OR public.my_entidad_id() = entidad_id
  );

DROP POLICY IF EXISTS sedes_delete ON public.sedes;
CREATE POLICY sedes_delete ON public.sedes FOR DELETE TO authenticated
  USING (
    public.is_contador()
    OR public.my_entidad_id() = entidad_id
  );

-- La política FOR ALL sedes_write (solo contador) bloqueaba updates de admin
-- al combinarse con OR en algunos caminos; la reemplazamos por una equivalente
-- alineada con insert/update/delete granular.
DROP POLICY IF EXISTS sedes_write ON public.sedes;
