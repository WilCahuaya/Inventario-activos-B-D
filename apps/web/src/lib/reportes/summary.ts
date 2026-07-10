import {
  buildClasificacionResumen as buildClasificacionResumenCore,
  buildValorizacionTotales as buildValorizacionTotalesCore,
  formatCuentaContableDisplay,
  resolveCuentaContableActivo,
  type ActivoValorizacionFuente,
} from "@inventario/types";
import type { ActivoReporte, ClasificacionResumen, ValorizacionTotales } from "./types";

function activoReporteAValorizacion(activo: ActivoReporte): ActivoValorizacionFuente {
  const resolved = resolveCuentaContableActivo(activo, {
    cuenta_codigo: activo.cuenta_contable ?? null,
    contabilidad: activo.contabilidad ?? null,
  });
  return {
    ...activo,
    cuenta_codigo: resolved.cuenta_codigo,
    contabilidad: resolved.contabilidad,
    catalogo_grupo: activo.grupo_contable?.trim() || null,
  };
}

/** @deprecated Usar ClasificacionResumen de @inventario/types (campo `categoria`). */
export type ClasificacionResumenReporte = ClasificacionResumen & {
  cuenta: string;
  grupo: string;
};

export function buildValorizacionTotales(
  activos: ActivoReporte[],
  fechaCorte: Date,
): ValorizacionTotales {
  return buildValorizacionTotalesCore(
    activos.map(activoReporteAValorizacion),
    fechaCorte,
  );
}

export function buildClasificacionResumen(
  activos: ActivoReporte[],
  fechaCorte: Date,
): ClasificacionResumen[] {
  return buildClasificacionResumenCore(
    activos.map(activoReporteAValorizacion),
    fechaCorte,
  );
}

export function clasificacionToRows(resumen: ClasificacionResumen[]): string[][] {
  return resumen.map((r) => [
    r.categoria || formatCuentaContableDisplay(r.cuenta, r.grupo !== "—" ? r.grupo : null),
    r.grupo,
    String(r.cantidad),
    r.valorAdquisicion.toFixed(2),
    r.depreciacionAcumulada.toFixed(2),
    r.valorNeto.toFixed(2),
  ]);
}

export function clasificacionTotalRow(totales: ValorizacionTotales): string[] {
  return [
    "TOTAL",
    "",
    String(totales.cantidad),
    totales.valorAdquisicion.toFixed(2),
    totales.depreciacionAcumulada.toFixed(2),
    totales.valorNeto.toFixed(2),
  ];
}

export const CLASIFICACION_HEADERS = [
  "Cuenta contable",
  "Grupo",
  "Cantidad",
  "Valor adquisición",
  "Dep. acumulada",
  "Valor neto",
] as const;
