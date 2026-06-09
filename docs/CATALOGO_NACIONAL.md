# Catálogo nacional de activos

Maestro en **Supabase**, réplica **solo lectura** en SQLite (desktop) para trabajo offline en campo.

## Fuente

| Archivo | Rol |
|---|---|
| `docs/Catalogo nacional de activos.ods` | Fuente oficial (~4.726 ítems) |
| `supabase/migrations/20260609100000_catalogo_nacional.sql` | Tabla + RLS + búsqueda |
| `supabase/seed/catalogo_nacional.sql` | Datos generados (commit en repo) |

Columnas importadas: código (8 dígitos), denominación, grupo, clase, cuenta contable, depreciación, resolución, estado.

## Despliegue en Supabase

1. Aplicar migraciones (Dashboard → SQL o CLI):

```bash
# Si usa Supabase CLI local/remoto
supabase db push
```

2. Cargar datos — **opción A** (SQL Editor, recomendado):

   Pegar/ejecutar el contenido de `supabase/seed/catalogo_nacional.sql`.
   El seed es **idempotente** (upsert por `codigo`); no usa `TRUNCATE` porque `activos` referencia el catálogo por FK.

3. Cargar datos — **opción B** (script con service role):

```bash
pnpm install
export SUPABASE_URL=https://xxxx.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=eyJ...
pnpm import:catalogo -- --push
```

4. Regenerar seed tras editar el ODS:

```bash
pnpm import:catalogo
```

## Código de barras

Formato acordado:

```text
74080001-000001
```

- `74080001` = código catálogo nacional (8 dígitos)
- `000001` = correlativo por entidad (6 dígitos)

Ver `docs/CODIGO_BARRAS_v1.md`.

## Web

Al crear un activo, el formulario usa **autocompletado** sobre `catalogo_nacional` (RPC `search_catalogo_nacional`). El `codigo_catalogo` del activo debe existir en el catálogo (FK).

## Desktop (offline)

Tras iniciar sesión, la app descarga el catálogo desde Supabase y lo guarda en SQLite (`userData/inventario.db`). IPC:

- `catalog:replace` — bulk sync
- `catalog:search` — búsqueda local sin red
- `catalog:meta` — conteo y fecha de sync

La búsqueda offline se usará en Fase 3 al registrar activos en campo.
