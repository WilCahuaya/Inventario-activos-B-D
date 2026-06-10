import {
  buildDescripcionBien,
  calcDepreciacionAcumulada,
  calcPeriodoMesesHasta,
  calcValorNeto,
  categoriaBienCorto,
  estadoBienLabel,
  formatCorrelativoDisplay,
  formatFechaISOToDDMMYYYY,
  formatMonedaPE,
} from "@inventario/types";
import type { ActivoReporte, ReporteId, ValorizacionTotales } from "./types";

export function esReporteInventarioValorizado(reporteId: ReporteId): boolean {
  return (
    reporteId === "inventario_ambiente_valorizado" ||
    reporteId === "inventario_entidad_valorizado"
  );
}

export function buildValorizacionTotalesFila(
  headers: readonly string[],
  totales: ValorizacionTotales,
): string[] {
  const row = headers.map(() => "");
  row[0] = "TOTAL";
  row[1] = String(totales.cantidad);

  const precioIdx = headers.indexOf("Precio adq.");
  const depIdx = headers.indexOf("Dep. acum.");
  const netoIdx = headers.indexOf("Valor neto");

  if (precioIdx >= 0) {
    row[precioIdx] = `S/ ${formatMonedaPE(totales.valorAdquisicion)}`;
  }
  if (depIdx >= 0) {
    row[depIdx] = `S/ ${formatMonedaPE(totales.depreciacionAcumulada)}`;
  }
  if (netoIdx >= 0) {
    row[netoIdx] = `S/ ${formatMonedaPE(totales.valorNeto)}`;
  }

  return row;
}

const HEADERS_SIN_VALORES_BASE = [
  "N°",
  "Cant.",
  "Und.",
  "Cat.",
  "Código",
  "Corr.",
  "Nombre del bien",
  "Descripción",
] as const;

const HEADERS_SIN_VALORES_COLA = ["Fecha adq.", "Estado", "Observación"] as const;

const HEADERS_VALORIZADOS_BASE = [
  "N°",
  "Cant.",
  "Und.",
  "Cat.",
  "Código",
  "Corr.",
  "Nombre del bien",
  "Descripción",
] as const;

const HEADERS_VALORIZADOS_COLA = [
  "Fecha adq.",
  "Estado",
  "Precio adq.",
  "V. mercado",
  "% Deprec.",
  "Periodo",
  "Dep. acum.",
  "Valor neto",
  "Observación",
  "CP",
] as const;

const COLUMNA_UBICACION = "Ubicación" as const;

/** Reportes por ambiente: la ubicación ya figura en el membrete. */
export function omitUbicacionEnTabla(reporteId: ReporteId): boolean {
  return (
    reporteId === "inventario_ambiente_sin_valores" ||
    reporteId === "inventario_ambiente_valorizado"
  );
}

const HEADERS_BAJAS = [
  "N°",
  "Código",
  "Corr.",
  "Nombre del bien",
  "Sede",
  "Ambiente",
  "Motivo de baja",
  "Fecha de baja",
] as const;

const HEADERS_ACTA = [
  "N°",
  "Código",
  "Nombre del bien",
  "Descripción",
  "Ubicación",
  "Estado",
] as const;

function comprobanteExport(activo: ActivoReporte): string {
  const serie = activo.comprobante_serie?.trim();
  if (!serie && !activo.comprobante_path) return "SIN CP";
  return serie ?? "PDF adjunto";
}

function ubicacionLabel(activo: ActivoReporte): string {
  return [activo.sede_nombre, activo.ambiente_nombre].filter(Boolean).join(" · ") || "—";
}

function valoresFila(activo: ActivoReporte, fechaCorte: Date): string[] {
  const precioAdq = !activo.valor_es_mercado ? activo.valor_adquisicion : null;
  const valorMercado = activo.valor_es_mercado ? activo.valor_adquisicion : null;
  const dadoDeBaja = activo.estado_registro === "DADO_DE_BAJA";
  const periodo = calcPeriodoMesesHasta(activo.fecha_adquisicion, fechaCorte);
  const depAcum = calcDepreciacionAcumulada(
    activo.valor_adquisicion,
    activo.vida_util_meses,
    periodo,
    dadoDeBaja,
  );
  const valorNeto = calcValorNeto(activo.valor_adquisicion, depAcum, dadoDeBaja);

  return [
    precioAdq != null ? `S/ ${formatMonedaPE(precioAdq)}` : "—",
    valorMercado != null ? `S/ ${formatMonedaPE(valorMercado)}` : "—",
    activo.depreciacion?.trim() || "—",
    periodo > 0 ? periodo.toFixed(2).replace(".", ",") : "—",
    depAcum != null ? `S/ ${formatMonedaPE(depAcum)}` : "—",
    valorNeto != null ? `S/ ${formatMonedaPE(valorNeto)}` : "—",
  ];
}

export function reporteHeaders(reporteId: ReporteId, valorizado: boolean): readonly string[] {
  if (reporteId === "reporte_bajas") return HEADERS_BAJAS;
  if (reporteId === "acta_inventario") return HEADERS_ACTA;

  const sinUbicacion = omitUbicacionEnTabla(reporteId);
  if (valorizado) {
    return sinUbicacion
      ? [...HEADERS_VALORIZADOS_BASE, ...HEADERS_VALORIZADOS_COLA]
      : [...HEADERS_VALORIZADOS_BASE, COLUMNA_UBICACION, ...HEADERS_VALORIZADOS_COLA];
  }
  return sinUbicacion
    ? [...HEADERS_SIN_VALORES_BASE, ...HEADERS_SIN_VALORES_COLA]
    : [...HEADERS_SIN_VALORES_BASE, COLUMNA_UBICACION, ...HEADERS_SIN_VALORES_COLA];
}

export function buildReporteRows(
  activos: ActivoReporte[],
  reporteId: ReporteId,
  valorizado: boolean,
  fechaCorte: Date,
): string[][] {
  if (reporteId === "reporte_bajas") {
    return activos.map((activo, index) => [
      String(index + 1),
      activo.codigo_barras ?? activo.codigo_catalogo,
      formatCorrelativoDisplay(activo.correlativo),
      activo.nombre,
      activo.sede_nombre ?? "—",
      activo.ambiente_nombre ?? "—",
      activo.motivo_baja?.trim() || "—",
      formatFechaISOToDDMMYYYY(activo.updated_at.slice(0, 10)) || "—",
    ]);
  }

  return activos.map((activo, index) => {
    const descripcion = buildDescripcionBien(
      activo.marca,
      activo.modelo,
      activo.serie,
      activo.color,
      activo.medidas,
    );
    if (reporteId === "acta_inventario") {
      return [
        String(index + 1),
        activo.codigo_barras ?? activo.codigo_catalogo,
        activo.nombre,
        descripcion || "—",
        ubicacionLabel(activo),
        estadoBienLabel(activo.estado_bien),
      ];
    }

    const sinUbicacion = omitUbicacionEnTabla(reporteId);
    const comun = [
      String(index + 1),
      "1",
      "Und.",
      categoriaBienCorto(activo.categoria),
      activo.codigo_catalogo,
      formatCorrelativoDisplay(activo.correlativo),
      activo.nombre,
      descripcion || "—",
    ];
    if (!sinUbicacion) {
      comun.push(ubicacionLabel(activo));
    }
    comun.push(
      formatFechaISOToDDMMYYYY(activo.fecha_adquisicion) || "—",
      estadoBienLabel(activo.estado_bien),
    );

    if (valorizado) {
      return [
        ...comun,
        ...valoresFila(activo, fechaCorte),
        activo.observacion?.trim() || "—",
        comprobanteExport(activo),
      ];
    }

    return [...comun, activo.observacion?.trim() || "—"];
  });
}

export function reporteTitulo(reporteId: ReporteId, valorizado: boolean): string {
  const map: Record<ReporteId, string> = {
    inventario_ambiente_sin_valores: "Inventario por ambiente (sin valores)",
    inventario_entidad_sin_valores: "Inventario general por entidad (sin valores)",
    inventario_ambiente_valorizado: "Inventario valorizado por ambiente",
    inventario_entidad_valorizado: "Inventario valorizado por entidad",
    acta_inventario: "Acta de inventario físico",
    reporte_bajas: "Reporte de activos dados de baja",
  };
  void valorizado;
  return map[reporteId];
}
