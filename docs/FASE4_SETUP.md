# Fase 4 — Reportes PDF y Excel

Reportes institucionales con membrete B&D Consultores Global EIRL.

## Requisitos

- Fases 1–3 operativas (activos registrados en Supabase)
- Usuario **CONTADOR** o **ADMIN_ENTIDAD**
- Navegador moderno (generación en cliente con jsPDF + SheetJS)

## Rutas

| Rol | URL |
|-----|-----|
| Contador | `/contador/reportes` |
| Admin entidad | `/admin/reportes` |

## Reportes disponibles

| # | Reporte | PDF | Excel | Roles |
|---|---------|-----|-------|-------|
| 1 | Inventario por ambiente (sin valores) | ✓ | ✓ | Contador, Admin |
| 2 | Inventario general por entidad (sin valores) | ✓ | ✓ | Contador, Admin |
| 3 | Inventario valorizado por ambiente | ✓ | ✓ | Contador, Admin |
| 4 | Inventario valorizado por entidad | ✓ | ✓ | Contador, Admin |
| 5 | Acta de inventario (firmas) | ✓ | — | Solo contador |
| 6 | Reporte de bajas | ✓ | ✓ | Solo contador |

## Contenido PDF institucional

- Razón social, producto y RUC en membrete
- Entidad, ambiente (si aplica), fecha de generación y **fecha de corte**
- Usuario generador (nombre y correo)
- Numeración de páginas y pie institucional
- Reportes valorizados: resumen por **cuenta contable** (catálogo nacional)
- Acta: bloques de firma al final

## Depreciación

Cálculo en cliente (`@inventario/types`):

- Período = meses desde adquisición hasta **fecha de corte**
- Dep. acumulada = `(valor / vida_util_meses) × período` (tope al valor)
- Valor neto = valor − dep. acumulada

## Export rápido desde inventario

Los botones «Exportar PDF/Excel» en la vista por ambiente usan el formato institucional valorizado (#3).

## Pendiente / mejoras

- Logo gráfico B&D en membrete (hoy solo texto)
- RUC real en `lib/reportes/branding.ts`
- Prueba de rendimiento: 500 activos &lt; 10 s
- Validación visual en LibreOffice y Excel

## Desarrollo

```bash
pnpm dev:web
# Abrir http://localhost:3000/contador/reportes
```
