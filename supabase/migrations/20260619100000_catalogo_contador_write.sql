-- Contador puede agregar ítems faltantes al catálogo nacional (extensiones en campo)

DROP POLICY IF EXISTS catalogo_insert_contador ON public.catalogo_nacional;
CREATE POLICY catalogo_insert_contador ON public.catalogo_nacional
  FOR INSERT TO authenticated
  WITH CHECK (public.is_contador());

DROP POLICY IF EXISTS catalogo_update_contador ON public.catalogo_nacional;
CREATE POLICY catalogo_update_contador ON public.catalogo_nacional
  FOR UPDATE TO authenticated
  USING (public.is_contador())
  WITH CHECK (public.is_contador());
