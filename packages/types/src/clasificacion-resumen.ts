import {
  calcDepreciacionAcumulada,
  calcPeriodoMesesHasta,
  calcValorNeto,
  formatCuentaContableDisplay,
  resolveCuentaContableActivo,
  type ActivoCuentaContableSource,
  type CatalogoCuentaContableSource,
} from "./index";

export interface ClasificacionResumen {
  categoria: string;
  cuenta: string;
  grupo: string;
  cantidad: number;
  valorAdquisicion: number;
  depreciacionAcumulada: number;
  valorNeto: number;
}

export interface ValorizacionTotales {
  cantidad: number;
  valorAdquisicion: number;
  depreciacionAcumulada: number;
  valorNeto: number;
}

/** Activo mínimo para valorización y resumen contable. */
export interface ActivoValorizacionFuente extends ActivoCuentaContableSource {
  valor_adquisicion?: number | null;
  vida_util_meses?: number | null;
  fecha_adquisicion?: string | null;
  estado_registro?: string;
  cuenta_codigo?: string | null;
  contabilidad?: string | null;
  catalogo_grupo?: string | null;
  catalogo?: CatalogoCuentaContableSource | null;
}

export function cuentaGrupoActivoValorizacion(
  activo: ActivoValorizacionFuente,
): { cuenta: string; grupo: string; categoria: string; codigo: string } {
  const resolved =
    activo.cuenta_codigo !== undefined || activo.contabilidad !== undefined
      ? {
          cuenta_codigo: activo.cuenta_codigo ?? null,
          contabilidad: activo.contabilidad ?? null,
        }
      : resolveCuentaContableActivo(activo, activo.catalogo ?? null);

  const codigo = resolved.cuenta_codigo?.trim() ?? "";
  const nombre = resolved.contabilidad?.trim() ?? "";
  const cuenta = formatCuentaContableDisplay(codigo, nombre);
  const grupo = activo.catalogo_grupo?.trim() || "—";
  const categoria = cuenta;

  return { cuenta, grupo, categoria, codigo: codigo || cuenta };
}

export function buildValorizacionTotales(
  activos: ActivoValorizacionFuente[],
  fechaCorte: Date = new Date(),
): ValorizacionTotales {
  let valorAdquisicion = 0;
  let depreciacionAcumulada = 0;
  let valorNeto = 0;

  for (const activo of activos) {
    const dadoDeBaja = activo.estado_registro === "DADO_DE_BAJA";
    const periodo = calcPeriodoMesesHasta(activo.fecha_adquisicion ?? null, fechaCorte);
    const depAcum =
      calcDepreciacionAcumulada(
        activo.valor_adquisicion ?? null,
        activo.vida_util_meses ?? null,
        periodo,
        dadoDeBaja,
      ) ?? 0;
    const neto = calcValorNeto(activo.valor_adquisicion ?? null, depAcum, dadoDeBaja) ?? 0;
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
  activos: ActivoValorizacionFuente[],
  fechaCorte: Date = new Date(),
): ClasificacionResumen[] {
  const map = new Map<string, ClasificacionResumen>();

  for (const activo of activos) {
    const { cuenta, grupo, categoria, codigo } = cuentaGrupoActivoValorizacion(activo);
    const key = codigo ? `${codigo}::${grupo}` : `${cuenta}::${grupo}`;
    const dadoDeBaja = activo.estado_registro === "DADO_DE_BAJA";
    const periodo = calcPeriodoMesesHasta(activo.fecha_adquisicion ?? null, fechaCorte);
    const depAcum =
      calcDepreciacionAcumulada(
        activo.valor_adquisicion ?? null,
        activo.vida_util_meses ?? null,
        periodo,
        dadoDeBaja,
      ) ?? 0;
    const valorNeto = calcValorNeto(activo.valor_adquisicion ?? null, depAcum, dadoDeBaja) ?? 0;
    const valor = activo.valor_adquisicion ?? 0;

    const existing = map.get(key);
    if (existing) {
      existing.cantidad += 1;
      existing.valorAdquisicion += valor;
      existing.depreciacionAcumulada += depAcum;
      existing.valorNeto += valorNeto;
    } else {
      map.set(key, {
        categoria,
        cuenta,
        grupo,
        cantidad: 1,
        valorAdquisicion: valor,
        depreciacionAcumulada: depAcum,
        valorNeto,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.categoria.localeCompare(b.categoria, "es", { numeric: true }),
  );
}
