# Deploy en Vercel — Staging / Producción

Guía para conectar el monorepo con Vercel y desplegar la plataforma web (`apps/web`).

---

## 1. Conectar el repositorio

1. Entrar a [vercel.com](https://vercel.com) e iniciar sesión (con GitHub).
2. **Add New → Project**
3. Importar: `WilCahuaya/Inventario-activos-B-D`
4. Configurar:

| Campo | Valor |
|---|---|
| **Framework Preset** | Next.js |
| **Root Directory** | `apps/web` ← **Importante** |
| **Branch** | `main` |

Vercel detectará `apps/web/vercel.json` automáticamente.

---

## 2. Variables de entorno (obligatorias)

En **Project Settings → Environment Variables**, agregar:

| Variable | Entornos | Valor |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development | `https://eeivmgvspexctjeowrmk.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development | Tu anon key de Supabase |

> No agregar `SUPABASE_SERVICE_ROLE_KEY` hasta Fase 1 (solo en servidor, cuando haya API routes).

---

## 3. Supabase — URLs para Vercel

Después del primer deploy, copiar la URL de Vercel (ej. `https://inventario-activos-b-d.vercel.app`).

En **Supabase Dashboard → Authentication → URL Configuration**:

| Campo | Valor |
|---|---|
| **Site URL** | `https://TU-PROYECTO.vercel.app` (producción) |
| **Redirect URLs** | Agregar: |

```
https://TU-PROYECTO.vercel.app/auth/callback
http://localhost:3000/auth/callback
http://localhost:5173/auth/callback
```

Mantener las URLs de localhost para desarrollo local.

---

## 4. Deploy

- **Automático:** cada `git push` a `main` despliega producción.
- **Preview:** cada PR genera una URL de preview.

Comandos locales (opcional, requiere Vercel CLI):

```bash
npm i -g vercel
cd apps/web
vercel login
vercel link
vercel --prod
```

---

## 5. Verificar después del deploy

- [ ] `/` — landing pública carga
- [ ] `/nosotros`, `/servicios`, `/blog` — navegación OK
- [ ] `/login` — botón Google funciona
- [ ] Login → redirige a `/contador`
- [ ] Google OAuth sin error `redirect_uri_mismatch`

---

## 6. Estructura monorepo

```
Inventario/
├── apps/web/          ← Root Directory en Vercel
│   └── vercel.json    ← install/build desde raíz del monorepo
├── packages/types/
└── packages/ui/
```

Los comandos en `vercel.json` suben a la raíz (`cd ../..`) para instalar workspaces `@inventario/*`.

---

## Errores comunes

| Error | Solución |
|---|---|
| `Module not found: @inventario/ui` | Root Directory debe ser `apps/web`, no la raíz del repo |
| Build falla en `pnpm install` | Verificar `packageManager` en `package.json` raíz |
| Google login falla en Vercel | Agregar URL de callback en Supabase Redirect URLs |
| `provider is not enabled` | Activar Google en Supabase Providers |
