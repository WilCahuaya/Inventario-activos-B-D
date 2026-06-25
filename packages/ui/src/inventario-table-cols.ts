/** Anchos % tabla inventario completa (17 columnas). Suman 100. */
export const INVENTARIO_TABLE_COL_WIDTHS_PCT = [
  2.5, // N°
  3, // Cat.
  9, // Código (catálogo-correlativo)
  11, // Nombre del bien
  16, // Descripción
  5, // Fecha adq.
  7, // Cuenta contable
  4.5, // Estado
  5, // Precio adq.
  5, // V. mercado
  3.5, // % Deprec.
  3.5, // Periodo
  5.5, // Dep. acum.
  5.5, // Valor neto
  8.5, // Observación
  4, // CP
  6, // Acciones
] as const;

/** Tabla compacta (xl–1919px): sin depreciación detallada, valor y deprec. unificados. */
export const INVENTARIO_TABLE_COMPACT_COL_WIDTHS_PCT = [
  3, // N°
  3, // Cat.
  10, // Código
  13, // Nombre
  13, // Descripción
  7, // Fecha
  7, // Cuenta contable
  6, // Estado
  7, // Precio PA/VM
  6, // Valor neto
  9, // Observación
  4, // CP
  11, // Acciones
] as const;

export const INVENTARIO_TABLE_COL_COUNT = INVENTARIO_TABLE_COL_WIDTHS_PCT.length;
export const INVENTARIO_TABLE_COMPACT_COL_COUNT = INVENTARIO_TABLE_COMPACT_COL_WIDTHS_PCT.length;

/** Ambiente preregistro (compacta): posible ambiente; sin CP ni valor neto. */
export const INVENTARIO_TABLE_PREREGISTRO_COL_WIDTHS_PCT = [
  3, // N°
  3, // Cat.
  9, // Código
  14, // Nombre del bien
  11, // Posible ambiente
  16, // Descripción
  7, // Fecha adq.
  7, // Cuenta contable
  6, // Estado
  7, // Precio
  12, // Observación
  5, // Acciones
] as const;

export const INVENTARIO_TABLE_PREREGISTRO_COL_COUNT = INVENTARIO_TABLE_PREREGISTRO_COL_WIDTHS_PCT.length;

/** Ambiente preregistro (pantalla ancha): sin depreciación ni CP. */
export const INVENTARIO_TABLE_FULL_PREREGISTRO_COL_WIDTHS_PCT = [
  3, // N°
  3, // Cat.
  9, // Código
  13, // Nombre del bien
  10, // Posible ambiente
  16, // Descripción
  6, // Fecha adq.
  7, // Cuenta contable
  5, // Estado
  6, // Precio adq.
  6, // V. mercado
  12, // Observación
  7, // Acciones
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
