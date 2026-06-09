# Sistema de Inventario de Activos Fijos

MVP v1.0 — **B&D Consultores Global EIRL**

Monorepo con plataforma web, app de escritorio Windows y backend Supabase.

## Estructura

```
inventario-activos/
├── apps/
│   ├── web/          # Next.js 14 — plataforma web
│   └── desktop/      # Electron — app de campo
├── packages/
│   ├── types/        # Tipos TypeScript compartidos
│   └── ui/           # Componentes UI compartidos
├── supabase/         # Migraciones y config Supabase
└── docs/             # Documentación del proyecto
```

## Requisitos

- Node.js ≥ 20
- pnpm ≥ 9

## Inicio rápido

```bash
# 1. Instalar dependencias (descarga binario de Electron)
pnpm install
# Si desktop falla con "Electron failed to install correctly":
# node node_modules/.pnpm/electron@*/node_modules/electron/install.js

# 2. Configurar Supabase (ver supabase/README.md)
cp .env.example apps/web/.env.local
cp .env.example apps/desktop/.env.local
# Editar con URL y anon key de su proyecto Supabase

# 3. Configurar login Google (ver docs/AUTH_GOOGLE.md)

# 4. Desarrollo
pnpm dev:web       # http://localhost:3000
pnpm dev:desktop   # Electron + Vite
```

## Scripts

| Comando | Descripción |
|---|---|
| `pnpm dev` | Web + Desktop en paralelo |
| `pnpm dev:web` | Solo plataforma web |
| `pnpm dev:desktop` | Solo app Electron |
| `pnpm build` | Build de todos los paquetes |
| `pnpm typecheck` | Verificación TypeScript |

## Fases de desarrollo

Ver [docs/PLAN_DESARROLLO_MVP_v1.md](./docs/PLAN_DESARROLLO_MVP_v1.md)

| Fase | Estado |
|---|---|
| 0 — Fundamentos | ✅ En progreso |
| 1 — Backend y datos | Pendiente |
| 2 — Plataforma web | Pendiente |
| 3 — App escritorio | Pendiente |
| 4 — Reportes | Pendiente |
| 5 — Piloto | Pendiente |
| 6 — Cierre MVP | Pendiente |

## Deploy (Vercel)

Ver guía paso a paso: [docs/DEPLOY_VERCEL.md](./docs/DEPLOY_VERCEL.md)

Resumen: importar repo en Vercel, **Root Directory** = `apps/web`, rama `main`, variables `NEXT_PUBLIC_SUPABASE_*`.

## Documentación

- [Plan de desarrollo](./docs/PLAN_DESARROLLO_MVP_v1.md)
- [Deploy Vercel](./docs/DEPLOY_VERCEL.md)
- [Arquitectura v1](./docs/ARQUITECTURA_v1.md)
- [Código de barras v1](./docs/CODIGO_BARRAS_v1.md)
- [Login con Google](./docs/AUTH_GOOGLE.md)
- [Contribución](./CONTRIBUTING.md)

## Stack

Supabase · Next.js 14 · Electron · TypeScript · Tailwind · shadcn-style UI · ZPL (Fase 3)
