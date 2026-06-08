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
