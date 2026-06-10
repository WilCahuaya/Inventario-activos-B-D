import {
  calcDepreciacionAcumulada,
  calcPeriodoMesesHasta,
  calcValorNeto,
} from "@inventario/types";
import type { ActivoReporte, ClasificacionResumen, ValorizacionTotales } from "./types";

export function buildValorizacionTotales(
  activos: ActivoReporte[],
  fechaCorte: Date,
): ValorizacionTotales {
  let valorAdquisicion = 0;
  let depreciacionAcumulada = 0;
  let valorNeto = 0;

  for (const activo of activos) {
    const dadoDeBaja = activo.estado_registro === "DADO_DE_BAJA";
    const periodo = calcPeriodoMesesHasta(activo.fecha_adquisicion, fechaCorte);
    const depAcum =
      calcDepreciacionAcumulada(
        activo.valor_adquisicion,
        activo.vida_util_meses,
        periodo,
        dadoDeBaja,
      ) ?? 0;
    const neto = calcValorNeto(activo.valor_adquisicion, depAcum, dadoDeBaja) ?? 0;
    valorAdquisicion += activo.valor_adquisicion ?? 0;
    depreciacionAcumulada += depAcum;
    valorNeto += neto;
  }

  return {
    cantidad: activos.length,
    valorAdquisicion,
    depreciacionAcumulada,
    valorNeto,
  };
}

export function buildClasificacionResumen(
  activos: ActivoReporte[],
  fechaCorte: Date,
): ClasificacionResumen[] {
  const map = new Map<string, ClasificacionResumen>();

  for (const activo of activos) {
    const cuenta = activo.cuenta_contable?.trim() || "Sin clasificar";
    const grupo = activo.grupo_contable?.trim() || "—";
    const key = `${cuenta}::${grupo}`;
    const dadoDeBaja = activo.estado_registro === "DADO_DE_BAJA";
    const periodo = calcPeriodoMesesHasta(activo.fecha_adquisicion, fechaCorte);
    const depAcum =
      calcDepreciacionAcumulada(
        activo.valor_adquisicion,
        activo.vida_util_meses,
        periodo,
        dadoDeBaja,
      ) ?? 0;
    const valorNeto = calcValorNeto(activo.valor_adquisicion, depAcum, dadoDeBaja) ?? 0;
    const valor = activo.valor_adquisicion ?? 0;

    const existing = map.get(key);
    if (existing) {
      existing.cantidad += 1;
      existing.valorAdquisicion += valor;
      existing.depreciacionAcumulada += depAcum;
      existing.valorNeto += valorNeto;
    } else {
      map.set(key, {
        cuenta,
        grupo,
        cantidad: 1,
        valorAdquisicion: valor,
        depreciacionAcumulada: depAcum,
        valorNeto,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.cuenta.localeCompare(b.cuenta));
}

export function clasificacionToRows(resumen: ClasificacionResumen[]): string[][] {
  return resumen.map((r) => [
    r.cuenta,
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
