# Fase 0 — Checklist de entrega

**Estado:** Completada (base técnica)  
**Fecha:** Junio 2026

## Entregables

- [x] Monorepo `pnpm` + Turborepo
- [x] `apps/web` — Next.js 14 + Tailwind + login Supabase
- [x] `apps/desktop` — Electron + React + login Supabase
- [x] `packages/types` — tipos compartidos + utilidades código barras
- [x] `packages/ui` — componentes UI compartidos (estilo shadcn)
- [x] `supabase/` — config.toml + migración placeholder
- [x] Documentación: ARQUITECTURA_v1, CODIGO_BARRAS_v1, CONTRIBUTING
- [x] `pnpm typecheck` — pasa en todos los paquetes
- [x] `pnpm build:web` — build exitoso

## Pendiente (equipo / manual)

- [ ] Crear proyecto Supabase en la nube (dev + staging)
- [ ] Copiar `.env.example` → `apps/web/.env.local` y `apps/desktop/.env.local`
- [ ] Configurar Google OAuth (ver `docs/AUTH_GOOGLE.md`)
- [ ] ~~Crear usuario de prueba en Supabase Auth~~ (no aplica con Google)
- [ ] Inicializar repositorio remoto (GitHub/GitLab) y push
- [ ] Conectar Vercel al repo (`apps/web` como root o monorepo)
- [ ] Validar formato código de barras con contadores (`docs/CODIGO_BARRAS_v1.md`)
- [ ] Configurar impresora PC42E-T (Fase 3)

## Comandos

```bash
pnpm install          # o: npx pnpm install
pnpm dev:web          # http://localhost:3000
pnpm dev:desktop      # Electron
pnpm typecheck
pnpm build:web
```

## Demo H1 (Semana 3)

Login + CRUD activo + RLS → **Fase 1**
