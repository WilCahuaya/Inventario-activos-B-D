# Supabase — Inventario Activos

## Requisitos

- [Supabase CLI](https://supabase.com/docs/guides/cli) (opcional, local)
- Proyecto en [supabase.com/dashboard](https://supabase.com/dashboard)

## Variables de entorno

Copiar a `apps/web/.env.local` y `apps/desktop/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## Login con Google

**No se crean usuarios manualmente.** Ver guía completa:

👉 **[docs/AUTH_GOOGLE.md](../docs/AUTH_GOOGLE.md)**

Resumen:

1. Google Cloud Console → OAuth Client ID → redirect URI:  
   `https://TU-REF.supabase.co/auth/v1/callback`
2. Supabase → Authentication → Providers → Google (activar)
3. Supabase → URL Configuration → redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:5173/auth/callback`

## Fase 1

Migraciones de tablas, RLS, roles y storage.

👉 **[docs/FASE1_SETUP.md](../docs/FASE1_SETUP.md)**

## Plantillas de correo (invitación y acceso)

Al crear una entidad se envía una invitación al administrador; el reenvío a usuarios ya confirmados usa **Magic Link**. Las plantillas con marca **B&D Consultores** están en:

- `supabase/templates/invite.html` — primera invitación
- `supabase/templates/magic-link.html` — reenvío / acceso

### Desarrollo local

Con `supabase start`, la plantilla se aplica automáticamente (ver `config.toml`). Los correos de prueba aparecen en **Inbucket**: http://localhost:54324

### Proyecto en Supabase (producción / staging)

**Opción A — CLI (recomendado)**

Con el proyecto enlazado (`supabase link`):

```bash
supabase config push
```

Esto sube la plantilla de `config.toml` al proyecto remoto.

**Opción B — Panel manual**

1. [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → **Email Templates**
2. **Invite user** — Subject: `B&D Consultores — Invitación al Inventario de Activos Fijos` — pegar `supabase/templates/invite.html`
3. **Magic Link** — Subject: `B&D Consultores — Acceso al Inventario de Activos Fijos` — pegar `supabase/templates/magic-link.html`
4. Guardar cada plantilla

**Remitente:** en **Authentication** → **SMTP Settings** puede configurar un correo propio (p. ej. `noreply@bdconsultores.pe`) para que no aparezca “Supabase Auth” como remitente.
