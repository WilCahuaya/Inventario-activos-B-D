# Especificación código de barras v1

**Estado:** Acordado Fase 1 — catálogo nacional 8 dígitos  
**Simbología:** Code 128  
**Impresora:** Honeywell PC42E-T (ZSim / ZPL II)

## Formato

**BD / web / texto en etiqueta** (con guion, 13 caracteres):

```
{CODIGO_CATALOGO}-{CORRELATIVO}   →   74643712-0003
```

**Símbolo Code 128 en ZPL** (sin guion, 12 dígitos):

```
{CODIGO_CATALOGO}{CORRELATIVO}   →   746437120003
```

| Parte | Descripción | Ejemplo |
|---|---|---|
| Código catálogo | 8 dígitos SBN | `74643712` |
| Separador (solo display/BD) | Guión `-` | `-` |
| Correlativo | 4 dígitos con ceros | `0003` |

Ejemplos por catálogo en la misma entidad (BD):

```
74080500-0001
74080500-0002
53649569-0001
74643712-0003
```

Mismo activo en el barcode impreso: `740805000001`, `746437120003`, etc.

## Reglas

1. El correlativo se asigna al pasar a estado `REGISTRADO` (Fase 1).
2. Unicidad: `(entidad_id, codigo_catalogo, correlativo)`; `codigo_barras` en BD usa el formato con guion.
3. Cada código de catálogo reinicia su secuencia en `0001` dentro de la entidad.
4. La pistola lee el símbolo compacto (`746437120003`); la app resuelve con `parseCodigoBarras()` y `codigoBarrasLookupVariants()`.
5. `codigo_catalogo` debe existir en `catalogo_nacional` (FK).

## ZPL de referencia (rollo 2 columnas × 50×25 mm, 203 dpi)

Cada fila física del rollo (`^PW800`, `^LL200`) puede llevar hasta dos etiquetas. Implementación: `apps/desktop/shared/print/label-zpl.ts`.

Diseño alineado a plantilla BarTender (`Documento1.btw`): franja izquierda **B&D / Control Patrimonial**, contenido con bien, código, año de adquisición y entidad. Ver `apps/desktop/shared/print/label-zpl.ts`.

Impresión Windows: envío **RAW** vía WinSpool (`electron/print/raw-windows.ts`), no `Out-Printer`.

## Validación pendiente

- [ ] Aprobar formato con equipo contable B&D
- [ ] Confirmar tamaño físico de etiqueta (mm)
- [ ] Calibrar PC42E-T con rollo real

## Implementación

- **Catálogo:** `catalogo_nacional` en Supabase + réplica SQLite desktop
- **Generación:** ZPL en Fase 3 (`apps/desktop`)
- **Parsing:** `@inventario/types` — `formatCodigoBarras` (display), `formatCodigoBarrasSimbolo` (ZPL), `parseCodigoBarras`
