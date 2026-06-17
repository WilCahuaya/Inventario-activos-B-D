import { formatMonedaPE } from "@inventario/types";
import type { Range, WorkSheet } from "xlsx-js-style";
import { buildInstitutionalHeader } from "./header-meta";
import {
  STYLE_BODY,
  STYLE_HEADER_BOLD,
  STYLE_HEADER_MUTED,
  STYLE_HEADER_NORMAL,
  STYLE_HEADER_TITLE,
  STYLE_RESUMEN_HEAD,
  STYLE_SECTION_TITLE,
  STYLE_TABLE_FOOT,
  STYLE_TABLE_HEAD,
  addMerge,
  setCell,
  setColumnWidths,
} from "./excel-styles";
import {
  buildReporteRows,
  buildValorizacionTotalesFila,
  esReporteInventarioValorizado,
  reporteHeaders,
} from "./rows";
import {
  CLASIFICACION_HEADERS,
  buildClasificacionResumen,
  buildValorizacionTotales,
  clasificacionToRows,
  clasificacionTotalRow,
} from "./summary";
import type { ActivoReporte, ReporteContexto } from "./types";
import { REPORTES } from "./types";

function slugFilename(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 48);
}

function formatClasificacionCells(row: string[]): string[] {
  return row.map((cell, i) => (i >= 3 ? `S/ ${formatMonedaPE(Number(cell))}` : cell));
}

function writeInstitutionalHeader(
  ws: WorkSheet,
  merges: Range[],
  colCount: number,
  header: ReturnType<typeof buildInstitutionalHeader>,
): number {
  const lastCol = Math.max(colCount - 1, 0);
  const split = Math.max(Math.floor(colCount / 2) - 1, 0);

  let r = 0;

  setCell(ws, r, 0, header.razonSocial, STYLE_HEADER_BOLD);
  setCell(ws, r, split + 1, header.generado, {
    ...STYLE_HEADER_NORMAL,
    alignment: { horizontal: "right", vertical: "center", wrapText: true },
  });
  addMerge(merges, r, 0, split);
  if (split + 1 < lastCol) addMerge(merges, r, split + 1, lastCol);
  r++;

  setCell(ws, r, 0, header.productoRuc, STYLE_HEADER_NORMAL);
  setCell(ws, r, split + 1, header.fechaCorte, {
    ...STYLE_HEADER_NORMAL,
    alignment: { horizontal: "right", vertical: "center", wrapText: true },
  });
  addMerge(merges, r, 0, split);
  if (split + 1 < lastCol) addMerge(merges, r, split + 1, lastCol);
  r++;

  setCell(ws, r, 0, header.titulo, STYLE_HEADER_TITLE);
  addMerge(merges, r, 0, lastCol);
  r++;

  setCell(ws, r, 0, header.metaLine, STYLE_HEADER_NORMAL);
  addMerge(merges, r, 0, lastCol);
  r++;

  setCell(ws, r, 0, header.usuarioLine, STYLE_HEADER_MUTED);
  addMerge(merges, r, 0, lastCol);
  r++;

  return r;
}

function writeTableSection(
  ws: WorkSheet,
  startRow: number,
  headers: readonly string[],
  rows: string[][],
  footRow?: string[],
): number {
  let r = startRow;

  headers.forEach((h, c) => setCell(ws, r, c, h, STYLE_TABLE_HEAD));
  r++;

  for (const row of rows) {
    row.forEach((value, c) => setCell(ws, r, c, value, STYLE_BODY));
    r++;
  }

  if (footRow) {
    footRow.forEach((value, c) => setCell(ws, r, c, value, STYLE_TABLE_FOOT));
    r++;
  }

  return r;
}

function writeClasificacionSection(
  ws: WorkSheet,
  merges: Range[],
  startRow: number,
  colCount: number,
  resumenRows: string[][],
  totalRow: string[],
): number {
  const lastCol = Math.max(colCount - 1, 0);
  let r = startRow + 1;

  setCell(ws, r, 0, "Resumen por clasificación contable", STYLE_SECTION_TITLE);
  addMerge(merges, r, 0, lastCol);
  r += 2;

  CLASIFICACION_HEADERS.forEach((h, c) => setCell(ws, r, c, h, STYLE_RESUMEN_HEAD));
  r++;

  for (const row of resumenRows) {
    formatClasificacionCells(row).forEach((value, c) => setCell(ws, r, c, value, STYLE_BODY));
    r++;
  }

  formatClasificacionCells(totalRow).forEach((value, c) => setCell(ws, r, c, value, STYLE_TABLE_FOOT));
  r++;

  return r;
}

function writeActaFirmas(ws: WorkSheet, merges: Range[], startRow: number, colCount: number): number {
  const lastCol = Math.max(colCount - 1, 0);
  const third = Math.max(Math.floor(colCount / 3), 1);
  let r = startRow + 1;

  setCell(ws, r, 0, "Conformidad y firmas", STYLE_SECTION_TITLE);
  addMerge(merges, r, 0, lastCol);
  r += 2;

  const bloques = ["Contador / Auditor", "Representante de la entidad", "Fecha"];
  const col0 = 0;
  const col1 = Math.min(third, lastCol);
  const col2 = Math.min(third * 2, lastCol);

  setCell(ws, r, col0, bloques[0]!, STYLE_HEADER_NORMAL);
  if (col1 < lastCol) setCell(ws, r, col1 + 1, bloques[1]!, STYLE_HEADER_NORMAL);
  if (col2 < lastCol) setCell(ws, r, col2 + 1, bloques[2]!, STYLE_HEADER_NORMAL);
  r++;

  setCell(ws, r, col0, "_________________________", STYLE_HEADER_NORMAL);
  if (col1 < lastCol) setCell(ws, r, col1 + 1, "_________________________", STYLE_HEADER_NORMAL);
  if (col2 < lastCol) setCell(ws, r, col2 + 1, "_________________________", STYLE_HEADER_NORMAL);
  r += 2;

  setCell(
    ws,
    r,
    0,
    "Las partes declaran haber verificado físicamente los bienes detallados en el presente acta.",
    STYLE_HEADER_MUTED,
  );
  addMerge(merges, r, 0, lastCol);

  return r + 1;
}

export async function exportReporteExcel(
  activos: ActivoReporte[],
  ctx: ReporteContexto,
): Promise<void> {
  const XLSX = await import("xlsx-js-style");
  const def = REPORTES.find((r) => r.id === ctx.reporteId)!;
  const fechaCorte = new Date(ctx.fechaCorte + "T12:00:00");
  const institutional = buildInstitutionalHeader(ctx, activos.length);
  const headers = reporteHeaders(ctx.reporteId, def.valorizado);
  const rows = buildReporteRows(activos, ctx.reporteId, def.valorizado, fechaCorte);
  const colCount = headers.length;

  const inventarioValorizado = esReporteInventarioValorizado(ctx.reporteId);
  const totales =
    inventarioValorizado && activos.length > 0
      ? buildValorizacionTotales(activos, fechaCorte)
      : null;

  const ws: WorkSheet = {};
  const merges: Range[] = [];

  let nextRow = writeInstitutionalHeader(ws, merges, colCount, institutional);
  nextRow++;
  const tableHeadRow = nextRow;

  nextRow = writeTableSection(
    ws,
    nextRow,
    headers,
    rows,
    totales ? buildValorizacionTotalesFila(headers, totales) : undefined,
  );

  if (def.valorizado && activos.length > 0) {
    const resumen = buildClasificacionResumen(activos, fechaCorte);
    const totalesResumen = totales ?? buildValorizacionTotales(activos, fechaCorte);
    nextRow = writeClasificacionSection(
      ws,
      merges,
      nextRow,
      colCount,
      clasificacionToRows(resumen),
      clasificacionTotalRow(totalesResumen),
    );
  }

  if (ctx.reporteId === "acta_inventario") {
    nextRow = writeActaFirmas(ws, merges, nextRow, colCount);
  }

  ws["!merges"] = merges;
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: nextRow, c: colCount - 1 } });
  setColumnWidths(ws, headers);
  ws["!views"] = [{ state: "frozen", ySplit: tableHeadRow + 1, activeCell: "A1" }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Reporte");

  const slug = slugFilename(ctx.ambienteNombre ?? ctx.entidadNombre);
  const fecha = ctx.fechaGeneracion.toISOString().slice(0, 10);
  XLSX.writeFile(wb, `reporte-${ctx.reporteId}-${slug}-${fecha}.xlsx`);
}
