/** Progreso de una importación por filas (Excel). */
export type ImportProgress = {
  /** Filas ya procesadas (0…total). */
  current: number;
  /** Total de filas a importar. */
  total: number;
  /** Porcentaje 0–100. */
  percent: number;
};

export function toImportProgress(current: number, total: number): ImportProgress {
  const safeTotal = Math.max(0, total);
  const safeCurrent = Math.min(Math.max(0, current), safeTotal || Math.max(0, current));
  const percent =
    safeTotal <= 0 ? 100 : Math.min(100, Math.round((safeCurrent / safeTotal) * 100));
  return { current: safeCurrent, total: safeTotal, percent };
}

/** Tamaño de lote para importaciones vía server actions (progreso en el cliente). */
export const IMPORT_PROGRESS_CHUNK_SIZE = 10;
