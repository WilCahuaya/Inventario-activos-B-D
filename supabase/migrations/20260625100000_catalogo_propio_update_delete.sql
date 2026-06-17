-- Solo el contador puede editar o eliminar ítems propios (origen = PROPIO).

DROP POLICY IF EXISTS catalogo_update_contador ON public.catalogo_nacional;

DROP POLICY IF EXISTS catalogo_update_propio ON public.catalogo_nacional;
CREATE POLICY catalogo_update_propio ON public.catalogo_nacional
  FOR UPDATE TO authenticated
  USING (public.is_contador() AND origen = 'PROPIO')
  WITH CHECK (public.is_contador() AND origen = 'PROPIO');

DROP POLICY IF EXISTS catalogo_delete_propio ON public.catalogo_nacional;
CREATE POLICY catalogo_delete_propio ON public.catalogo_nacional
  FOR DELETE TO authenticated
  USING (public.is_contador() AND origen = 'PROPIO');
