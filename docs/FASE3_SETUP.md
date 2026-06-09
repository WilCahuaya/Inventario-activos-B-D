# Fase 3 — App de escritorio (contador)

Herramienta de campo: escaneo con pistola USB, registro/edición de activos, catálogo offline, cola de sincronización e impresión ZPL.

## Requisitos

- Node 20+, pnpm
- `apps/desktop/.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
- Usuario con rol **CONTADOR** en `profiles`
- Catálogo nacional importado en Supabase (`pnpm import:catalogo`)
- Impresora Honeywell PC42E-T (modo ZSim) para etiquetas en producción

## Desarrollo

```bash
pnpm dev:desktop
```

## Sprint 3A — Core

| Módulo | Estado |
|--------|--------|
| Login + sesión persistente | Hecho |
| Dashboard + selector de entidad | Hecho |
| Escaneo USB → ficha | Hecho |
| Registro / edición | Hecho |
| Indicador en línea / offline | Hecho |

## Sprint 3B — Offline + etiquetas

| Módulo | Estado |
|--------|--------|
| Caché local de activos por entidad | Hecho |
| Cola offline (crear/editar) + sync al reconectar | Hecho |
| Indicador «N pendientes» en barra | Hecho |
| Etiqueta ZPL Code 128 (50×25 mm ref.) | Hecho |
| Vista previa + guardar .zpl + envío a impresora | Hecho |
| Reimpresión desde ficha al escanear | Hecho |
| Impresión por lote | Pendiente |

## Pistola USB

El lector envía el código + Enter. La búsqueda usa `codigo_barras` o `codigo_catalogo`. Sin internet se consulta la **caché local** (última sincronización en línea).

## Offline

1. Con internet, los activos de la entidad se descargan a SQLite.
2. Sin internet: escanear y registrar/editar encolan cambios.
3. Al reconectar: sincronización automática + botón «Sincronizar ahora».

## Impresión ZPL

1. En la ficha del activo → **Imprimir etiqueta**.
2. Elija la impresora (nombre exacto en Windows) o guarde el `.zpl`.
3. Plantilla según `docs/CODIGO_BARRAS_v1.md`.

## Pendiente / mejoras

- Impresión por lote desde lista de códigos
- Calibración física PC42E-T en sitio
- Prueba de 4 h offline sin pérdida de datos
