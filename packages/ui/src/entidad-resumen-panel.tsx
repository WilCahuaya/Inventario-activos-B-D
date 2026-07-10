"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import {
  buildClasificacionResumen,
  buildValorizacionTotales,
  entidadMuestraSelectorSede,
  type ActivoValorizacionFuente,
  type ClasificacionResumen,
} from "@inventario/types";
import {
  PanelEmptyState,
  PanelCountLabel,
  PanelTableColgroup,
  PanelTableTd,
  PanelTableTh,
  StatusBadge,
  panelCardClass,
  panelTableHeadRowClass,
  panelTableShrinkCellClass,
  panelTableNowrapCellClass,
  panelTableStickyHeadClass,
} from "./panel";
import { scrollbarThemedClass } from "./responsive-layout";

export interface EntidadResumenAmbiente {
  id: string;
  nombre: string;
  descripcion?: string | null;
  responsable?: string | null;
  sede_id: string;
  sede_nombre: string;
  sede_es_principal: boolean;
  activo_count?: number;
  activo?: boolean;
}

export interface EntidadResumenSede {
  id: string;
  nombre: string;
  es_principal?: boolean;
}

export interface EntidadResumenActivo extends ActivoValorizacionFuente {
  ambiente_id?: string | null;
  estado_registro?: string;
}

export interface EntidadResumenPanelProps {
  entidadNombre: string;
  entidadRuc?: string | null;
  activos: EntidadResumenActivo[];
  ambientes: EntidadResumenAmbiente[];
  sedes: EntidadResumenSede[];
  fechaResumen?: Date;
  headerExtra?: ReactNode;
  /** Oculta el bloque superior con nombre/RUC (p. ej. dashboard con tabla de entidades arriba). */
  showEntidadHeader?: boolean;
}

const RESUMEN_TABLE_WIDTHS_PCT = [38, 22, 22, 18] as const;
const AMBIENTES_RESUMEN_TABLE_WIDTHS_PCT = [18, 14, 30, 10, 12] as const;

function filtrarRegistrados<T extends { estado_registro?: string }>(activos: T[]): T[] {
  return activos.filter((a) => a.estado_registro === "REGISTRADO");
}

function conteosPorAmbiente(activos: EntidadResumenActivo[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const activo of filtrarRegistrados(activos)) {
    const ambienteId = activo.ambiente_id?.trim();
    if (!ambienteId) continue;
    map.set(ambienteId, (map.get(ambienteId) ?? 0) + 1);
  }
  return map;
}

function conteoActivosAmbiente(
  ambiente: EntidadResumenAmbiente,
  conteos: Map<string, number>,
): number {
  if (typeof ambiente.activo_count === "number") return ambiente.activo_count;
  return conteos.get(ambiente.id) ?? 0;
}

function formatResumenNumero(value: number): string {
  if (!Number.isFinite(value)) return "";
  return value.toLocaleString("es-PE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 5,
  });
}

const RESUMEN_TABLA_HEAD_CLASS =
  "bg-sky-100 text-foreground dark:bg-sky-950/50 [&_th]:bg-sky-100 dark:[&_th]:bg-sky-950/50";
const RESUMEN_TABLA_TOTAL_CLASS = "bg-sky-100/80 font-semibold dark:bg-sky-950/40";

export function EntidadResumenPanel({
  entidadNombre,
  entidadRuc,
  activos,
  ambientes,
  sedes,
  fechaResumen = new Date(),
  headerExtra,
  showEntidadHeader = true,
}: EntidadResumenPanelProps) {
  const registrados = useMemo(() => filtrarRegistrados(activos), [activos]);
  const resumenFilas = useMemo(
    () => buildClasificacionResumen(registrados, fechaResumen),
    [registrados, fechaResumen],
  );
  const totales = useMemo(
    () => buildValorizacionTotales(registrados, fechaResumen),
    [registrados, fechaResumen],
  );

  const conteosAmbiente = useMemo(() => conteosPorAmbiente(activos), [activos]);
  const multiplesSedes = entidadMuestraSelectorSede(sedes);

  const gruposAmbientes = useMemo(() => {
    const porSede = new Map<string, EntidadResumenAmbiente[]>();
    for (const amb of ambientes) {
      const lista = porSede.get(amb.sede_id) ?? [];
      lista.push(amb);
      porSede.set(amb.sede_id, lista);
    }

    const sedesOrdenadas = [...sedes].sort((a, b) => {
      if (a.es_principal !== b.es_principal) return a.es_principal ? -1 : 1;
      return a.nombre.localeCompare(b.nombre);
    });

    return sedesOrdenadas
      .filter((sede) => porSede.has(sede.id))
      .map((sede) => ({
        sede,
        ambientes: [...(porSede.get(sede.id) ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      }));
  }, [ambientes, sedes]);

  const fechaLabel = fechaResumen.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {showEntidadHeader && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground">{entidadNombre}</h2>
            {entidadRuc && (
              <p className="text-sm text-muted-foreground">RUC {entidadRuc}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Solo activos registrados · valorización al {fechaLabel}
            </p>
          </div>
          {headerExtra}
        </div>
      )}

      {!showEntidadHeader && headerExtra ? (
        <div className="flex flex-wrap items-center justify-end gap-2">{headerExtra}</div>
      ) : null}

      <section className={panelCardClass}>
        <div className="border-b border-border/60 px-4 py-4 text-center">
          <h3 className="text-xl font-bold tracking-wide text-foreground">RESUMEN</h3>
        </div>

        {resumenFilas.length === 0 ? (
          <PanelEmptyState message="No hay activos registrados para valorizar en esta entidad." />
        ) : (
          <div className={`${scrollbarThemedClass} overflow-x-auto`}>
            <table className="w-full min-w-[44rem] table-fixed text-left text-sm">
              <PanelTableColgroup widths={RESUMEN_TABLE_WIDTHS_PCT} />
              <thead className={`${panelTableStickyHeadClass} ${RESUMEN_TABLA_HEAD_CLASS}`}>
                <tr className={panelTableHeadRowClass}>
                  <PanelTableTh>Categoría</PanelTableTh>
                  <PanelTableTh align="right" className="whitespace-nowrap">
                    Suma de Importe
                  </PanelTableTh>
                  <PanelTableTh align="right" className="whitespace-nowrap">
                    Suma de Depreciación acumulada
                  </PanelTableTh>
                  <PanelTableTh align="right" className="whitespace-nowrap">
                    Suma de Valor neto
                  </PanelTableTh>
                </tr>
              </thead>
              <tbody>
                {resumenFilas.map((fila: ClasificacionResumen) => (
                  <tr key={`${fila.cuenta}::${fila.grupo}`}>
                    <PanelTableTd className="font-medium">{fila.categoria}</PanelTableTd>
                    <PanelTableTd
                      align="right"
                      className="whitespace-nowrap font-mono text-xs tabular-nums"
                    >
                      {formatResumenNumero(fila.valorAdquisicion)}
                    </PanelTableTd>
                    <PanelTableTd
                      align="right"
                      className="whitespace-nowrap font-mono text-xs tabular-nums"
                    >
                      {formatResumenNumero(fila.depreciacionAcumulada)}
                    </PanelTableTd>
                    <PanelTableTd
                      align="right"
                      className="whitespace-nowrap font-mono text-xs tabular-nums"
                    >
                      {formatResumenNumero(fila.valorNeto)}
                    </PanelTableTd>
                  </tr>
                ))}
                <tr className={RESUMEN_TABLA_TOTAL_CLASS}>
                  <PanelTableTd>Total general</PanelTableTd>
                  <PanelTableTd
                    align="right"
                    className="whitespace-nowrap font-mono text-xs tabular-nums"
                  >
                    {formatResumenNumero(totales.valorAdquisicion)}
                  </PanelTableTd>
                  <PanelTableTd
                    align="right"
                    className="whitespace-nowrap font-mono text-xs tabular-nums"
                  >
                    {formatResumenNumero(totales.depreciacionAcumulada)}
                  </PanelTableTd>
                  <PanelTableTd
                    align="right"
                    className="whitespace-nowrap font-mono text-xs tabular-nums"
                  >
                    {formatResumenNumero(totales.valorNeto)}
                  </PanelTableTd>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={panelCardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">Ambientes</h3>
            <p className="text-xs text-muted-foreground">
              {multiplesSedes ? "Agrupados por sucursal" : "Inventario por ambiente"}
            </p>
          </div>
          <PanelCountLabel count={ambientes.length} singular="ambiente" plural="ambientes" />
        </div>

        {gruposAmbientes.length === 0 ? (
          <PanelEmptyState message="No hay ambientes registrados en esta entidad." />
        ) : (
          <div className="divide-y divide-border/60">
            {gruposAmbientes.map(({ sede, ambientes: lista }) => (
              <div key={sede.id}>
                {multiplesSedes && (
                  <div className="border-b border-border/40 bg-muted/20 px-4 py-2.5">
                    <h4 className="text-sm font-bold uppercase tracking-wide text-primary">
                      {sede.nombre}
                    </h4>
                  </div>
                )}
                <div className={`${scrollbarThemedClass} overflow-x-auto`}>
                  <table className="w-full min-w-[48rem] table-fixed text-left text-sm">
                    <PanelTableColgroup widths={AMBIENTES_RESUMEN_TABLE_WIDTHS_PCT} />
                    <thead className={panelTableStickyHeadClass}>
                      <tr className={panelTableHeadRowClass}>
                        <PanelTableTh>Ambiente</PanelTableTh>
                        <PanelTableTh>Responsable</PanelTableTh>
                        <PanelTableTh>Descripción</PanelTableTh>
                        <PanelTableTh align="center" className={panelTableShrinkCellClass}>
                          Activos
                        </PanelTableTh>
                        <PanelTableTh className={panelTableNowrapCellClass}>Estado</PanelTableTh>
                      </tr>
                    </thead>
                    <tbody>
                      {lista.map((amb) => (
                        <tr key={amb.id} className="border-b border-border/40 last:border-b-0">
                          <PanelTableTd className="font-medium" title={amb.nombre}>
                            {amb.nombre}
                          </PanelTableTd>
                          <PanelTableTd title={amb.responsable ?? undefined}>
                            {amb.responsable ?? "—"}
                          </PanelTableTd>
                          <PanelTableTd
                            className="text-muted-foreground"
                            title={amb.descripcion ?? undefined}
                          >
                            {amb.descripcion ?? "—"}
                          </PanelTableTd>
                          <PanelTableTd align="center" className={panelTableShrinkCellClass}>
                            {conteoActivosAmbiente(amb, conteosAmbiente)}
                          </PanelTableTd>
                          <PanelTableTd className={panelTableNowrapCellClass}>
                            <StatusBadge variant={amb.activo !== false ? "active" : "default"}>
                              {amb.activo !== false ? "Activo" : "Inactivo"}
                            </StatusBadge>
                          </PanelTableTd>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
