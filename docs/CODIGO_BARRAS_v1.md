# Especificación código de barras v1

**Estado:** Acordado Fase 1 — catálogo nacional 8 dígitos  
**Simbología:** Code 128  
**Impresora:** Honeywell PC42E-T (ZSim / ZPL II)

## Formato

```
{CODIGO_CATALOGO}-{CORRELATIVO}

Ejemplos:
  74080001-000001
  04220050-000042
  33690101-001234
```

| Parte | Descripción | Ejemplo |
|---|---|---|
| Código catálogo | Código oficial del catálogo nacional SBN (8 dígitos) | `74080001` |
| Separador | Guión `-` | `-` |
| Correlativo | Secuencial por entidad **y código catálogo**, 6 dígitos con ceros | `000001` |

Ejemplos por catálogo en la misma entidad:

```
74080500-000001
74080500-000002
53649569-000001
74643712-000001
```

## Reglas

1. El correlativo se asigna al pasar a estado `REGISTRADO` (Fase 1).
2. Unicidad: `(entidad_id, codigo_catalogo, correlativo)`; el string completo en `codigo_barras` es único globalmente.
3. Cada código de catálogo reinicia su secuencia en `000001` dentro de la entidad.
4. La pistola USB envía el string completo + Enter.
5. La app parsea con `parseCodigoBarras()` de `@inventario/types`.
6. `codigo_catalogo` debe existir en `catalogo_nacional` (FK).

## ZPL de referencia (etiqueta 50×25 mm)

```zpl
^XA
^FO20,10^A0N,20,20^FD{B&D - ENTIDAD}^FS
^FO20,35^BY2^BCN,60,Y,N,N^FD{CODIGO_COMPLETO}^FS
^FO20,110^A0N,18,18^FD{NOMBRE_BIEN}^FS
^XZ
```

## Validación pendiente

- [ ] Aprobar formato con equipo contable B&D
- [ ] Confirmar tamaño físico de etiqueta (mm)
- [ ] Calibrar PC42E-T con rollo real

## Implementación

- **Catálogo:** `catalogo_nacional` en Supabase + réplica SQLite desktop
- **Generación:** ZPL en Fase 3 (`apps/desktop`)
- **Parsing:** `@inventario/types` — `formatCodigoBarras` / `parseCodigoBarras`
