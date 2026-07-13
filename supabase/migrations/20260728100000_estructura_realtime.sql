-- Habilita Supabase Realtime en tablas estructurales (sync web ↔ desktop).

ALTER TABLE public.entidades REPLICA IDENTITY FULL;
ALTER TABLE public.sedes REPLICA IDENTITY FULL;
ALTER TABLE public.ambientes REPLICA IDENTITY FULL;
ALTER TABLE public.responsables REPLICA IDENTITY FULL;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['entidades', 'sedes', 'ambientes', 'responsables']
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
