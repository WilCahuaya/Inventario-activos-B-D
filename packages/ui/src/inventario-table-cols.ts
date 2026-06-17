/** Anchos % para tabla inventario (17 columnas, sin Cant./Und.). Suman 100. */
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

export const INVENTARIO_TABLE_COL_COUNT = INVENTARIO_TABLE_COL_WIDTHS_PCT.length;

/** Ancho % de la columna opcional de selección (desktop, impresión por lote). */
export const INVENTARIO_TABLE_SELECTION_COL_PCT = 3;

export function inventarioTableColWidths(options?: { withSelection?: boolean }): string[] {
  const { withSelection = false } = options ?? {};
  if (!withSelection) {
    return INVENTARIO_TABLE_COL_WIDTHS_PCT.map((w) => `${w}%`);
  }
  const dataScale = (100 - INVENTARIO_TABLE_SELECTION_COL_PCT) / 100;
  return [
    `${INVENTARIO_TABLE_SELECTION_COL_PCT}%`,
    ...INVENTARIO_TABLE_COL_WIDTHS_PCT.map((w) => `${w * dataScale}%`),
  ];
}
