# Fase 1 — Backend, datos y seguridad

**Objetivo:** Base de datos, RLS, perfiles, CRUD de activos y storage.

---

## 1. Aplicar migraciones en Supabase

### Opción A — SQL Editor (recomendado si no tienes CLI)

1. Supabase Dashboard → **SQL Editor**
2. Ejecutar en orden:
   - `supabase/migrations/20260606000000_fase0_placeholder.sql` (si no se aplicó)
   - `supabase/migrations/20260608100000_fase1_schema.sql`
   - `supabase/migrations/20260609100000_catalogo_nacional.sql`
   - `supabase/migrations/20260610100000_activos_campos_extendidos.sql`
   - `supabase/migrations/20260611100000_fase2_entidad_sede_ambiente.sql`

3. Cargar catálogo nacional (~4.726 ítems):

   - Ejecutar `supabase/seed/catalogo_nacional.sql` en SQL Editor, **o**
   - `pnpm import:catalogo -- --push` con `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`

   Ver `docs/CATALOGO_NACIONAL.md`.

### Opción B — Supabase CLI

```bash
supabase link --project-ref eeivmgvspexctjeowrmk
supabase db push
```

---

## 2. Crear usuarios de prueba (Google + profiles)

**No hay registro público.** Cada usuario debe existir en `auth.users` (vía login Google) y en `profiles`.

### Paso 1 — Login una vez

1. Inicie sesión con Google en `http://localhost:3000/login`
2. Si aparece *“cuenta no autorizada”*, es normal: aún no hay perfil.

### Paso 2 — Obtener UUID del usuario

Supabase → **Authentication → Users** → copiar el **User UID** del correo.

### Paso 3 — Crear entidad de prueba (SQL Editor)

```sql
INSERT INTO public.entidades (nombre, ruc)
VALUES ('Entidad Demo Piloto', '20123456789')
RETURNING id;
```

Guarde el `id` retornado.

### Paso 4 — Crear perfil CONTADOR

```sql
INSERT INTO public.profiles (id, email, nombre, rol, entidad_id, activo)
VALUES (
  'UUID-DEL-USUARIO-GOOGLE',
  'contador@ejemplo.com',
  'Contador Demo',
  'CONTADOR',
  NULL,
  TRUE
);
```

### Paso 5 — Crear perfil ADMIN_ENTIDAD (otro correo Google)

Repita login con otro Gmail, copie UUID y ejecute:

```sql
INSERT INTO public.profiles (id, email, nombre, rol, entidad_id, activo)
VALUES (
  'UUID-ADMIN-GOOGLE',
  'admin@entidad.com',
  'Admin Entidad Demo',
  'ADMIN_ENTIDAD',
  'UUID-ENTIDAD-DEMO',
  TRUE
);
```

---

## 3. Probar criterios de aceptación

| Caso | Cómo probar |
|------|-------------|
| Contador crea activo → REGISTRADO + correlativo | Login contador → Inventario → Registrar activo |
| Admin crea activo → PREREGISTRADO | Login admin → Activos → Preregistrar |
| Contador valida preregistrado | Inventario → botón **Validar → REGISTRADO** |
| Admin no ve otra entidad | RLS: solo activos de su `entidad_id` |
| Historial automático | Supabase → `historial_cambios` tras editar un activo |
| Upload foto/PDF | Tabla inventario → subir archivos (máx. 500 KB foto) |

---

## 4. Buckets de storage

Creados por la migración:

| Bucket | Uso | Límite |
|--------|-----|--------|
| `fotos-activos` | JPEG/PNG/WebP | 500 KB |
| `comprobantes-activos` | PDF/imagen | 5 MB |

Ruta: `{entidad_id}/{activo_id}/foto.jpg`

---

## 5. Roles y rutas web

| Rol | Panel | Creación activos |
|-----|-------|------------------|
| `CONTADOR` | `/contador` | Estado `REGISTRADO` + código de barras |
| `ADMIN_ENTIDAD` | `/admin` | Estado `PREREGISTRADO` sin correlativo |

---

## 6. Comandos

```bash
pnpm typecheck
pnpm build:web
pnpm dev:web
```

---

## Pendiente Fase 2

- UI completa sedes/ambientes
- Ficha detalle de activo
- Bandeja preregistrados
- Restricción admin: solo editar ambiente
