-- Reset piloto: borra entidades y datos operativos vinculados.
-- NO borra: catálogo nacional SBN, cuentas contables maestras, usuarios CONTADOR.
-- Alternativa manual: Supabase SQL Editor, o pnpm reset:piloto -- --confirm

BEGIN;

DELETE FROM public.activos;
DELETE FROM public.eliminaciones_activos_log;

DELETE FROM auth.users
WHERE id IN (
  SELECT id FROM public.profiles WHERE rol = 'ADMIN_ENTIDAD'
);

DELETE FROM public.entidades;

COMMIT;

NOTIFY pgrst, 'reload schema';
