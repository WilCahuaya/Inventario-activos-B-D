/** Anchos % tabla inventario completa (17 columnas). Suman 100. */
export const INVENTARIO_TABLE_COL_WIDTHS_PCT = [
  2.5, // N°
  3, // Cat.
  6, // Código
  3.5, // Corr.
  12, // Nombre del bien
  17, // Descripción
  5, // Fecha adq.
  4.5, // Estado
  5.5, // Precio adq.
  5.5, // V. mercado
  4, // % Deprec.
  4, // Periodo
  6, // Dep. acum.
  6, // Valor neto
  9, // Observación
  4.5, // CP
  6.5, // Acciones
] as const;

/** Tabla compacta (xl–1919px): sin correlativo, valor y deprec. unificados. */
export const INVENTARIO_TABLE_COMPACT_COL_WIDTHS_PCT = [
  3, // N°
  3, // Cat.
  7, // Código
  14, // Nombre
  14, // Descripción
  7, // Fecha
  6, // Estado
  8, // Precio PA/VM
  7, // Valor neto
  10, // Observación
  5, // CP
  12, // Acciones
] as const;

export const INVENTARIO_TABLE_COL_COUNT = INVENTARIO_TABLE_COL_WIDTHS_PCT.length;
export const INVENTARIO_TABLE_COMPACT_COL_COUNT = INVENTARIO_TABLE_COMPACT_COL_WIDTHS_PCT.length;

/** Ambiente preregistro (compacta): posible ambiente; sin CP ni valor neto. */
export const INVENTARIO_TABLE_PREREGISTRO_COL_WIDTHS_PCT = [
  3, // N°
  3, // Cat.
  8, // Código
  16, // Nombre del bien
  12, // Posible ambiente
  18, // Descripción
  7, // Fecha adq.
  6, // Estado
  8, // Precio
  14, // Observación
  5, // Acciones
] as const;

export const INVENTARIO_TABLE_PREREGISTRO_COL_COUNT = INVENTARIO_TABLE_PREREGISTRO_COL_WIDTHS_PCT.length;

/** Ambiente preregistro (pantalla ancha): sin correlativo, depreciación ni CP. */
export const INVENTARIO_TABLE_FULL_PREREGISTRO_COL_WIDTHS_PCT = [
  3, // N°
  3, // Cat.
  7, // Código
  14, // Nombre del bien
  11, // Posible ambiente
  17, // Descripción
  6, // Fecha adq.
  5, // Estado
  7, // Precio adq.
  6, // V. mercado
  13, // Observación
  8, // Acciones
] as const;

export const INVENTARIO_TABLE_FULL_PREREGISTRO_COL_COUNT =
  INVENTARIO_TABLE_FULL_PREREGISTRO_COL_WIDTHS_PCT.length;

export const INVENTARIO_TABLE_SELECTION_COL_PCT = 3;

function scaleWidths(widths: readonly number[], withSelection: boolean): string[] {
  if (!withSelection) {
    return widths.map((w) => `${w}%`);
  }
  const dataScale = (100 - INVENTARIO_TABLE_SELECTION_COL_PCT) / 100;
  return [
    `${INVENTARIO_TABLE_SELECTION_COL_PCT}%`,
    ...widths.map((w) => `${w * dataScale}%`),
  ];
}

export function inventarioTableColWidths(options?: { withSelection?: boolean }): string[] {
  return scaleWidths(INVENTARIO_TABLE_COL_WIDTHS_PCT, options?.withSelection ?? false);
}

export function inventarioTableColWidthsCompact(options?: { withSelection?: boolean }): string[] {
  return scaleWidths(INVENTARIO_TABLE_COMPACT_COL_WIDTHS_PCT, options?.withSelection ?? false);
}

export function inventarioTableColWidthsPreregistro(options?: { withSelection?: boolean }): string[] {
  return scaleWidths(INVENTARIO_TABLE_PREREGISTRO_COL_WIDTHS_PCT, options?.withSelection ?? false);
}

export function inventarioTableColWidthsFullPreregistro(options?: {
  withSelection?: boolean;
}): string[] {
  return scaleWidths(INVENTARIO_TABLE_FULL_PREREGISTRO_COL_WIDTHS_PCT, options?.withSelection ?? false);
}
