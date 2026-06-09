"use client";

import type { Activo } from "@inventario/types";
import {
  buildDescripcionBien,
  calcDepreciacionAcumulada,
  calcPeriodoMeses,
  calcValorNeto,
  categoriaBienCorto,
  estadoBienLabel,
  formatCorrelativoDisplay,
  formatFechaISOToDDMMYYYY,
  formatMonedaPE,
} from "@inventario/types";
import { ActivoAccionesBar } from "./ActivoAccionesBar";
import { ComprobanteInline } from "./ComprobanteInline";
import { panelCardClass } from "./panel-ui";

interface ActivosInventarioMobileCardsProps {
  activos: Activo[];
  onEditActivo: (activo: Activo) => void;
  puedeDarDeBaja?: boolean;
  puedeValidarPreregistro?: boolean;
  editarLabel?: string;
  mostrarEstadoRegistro?: boolean;
  emptyActionLabel?: string;
  modoAdmin?: boolean;
}

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-sm text-foreground">{value?.trim() || "—"}</p>
    </div>
  );
}

export function ActivosInventarioMobileCards({
  activos,
  onEditActivo,
  puedeDarDeBaja = true,
  puedeValidarPreregistro = false,
  editarLabel,
  mostrarEstadoRegistro = false,
  emptyActionLabel = "+ Nuevo activo",
  modoAdmin = false,
}: ActivosInventarioMobileCardsProps) {
  if (activos.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-sm text-muted-foreground">
        No hay activos registrados. Use «{emptyActionLabel}» para agregar el primero.
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 sm:p-4">
      {activos.map((activo, index) => {
        const descripcion = buildDescripcionBien(
          activo.marca,
          activo.modelo,
          activo.serie,
          activo.color,
          activo.medidas,
        );
        const periodo = calcPeriodoMeses(activo.fecha_adquisicion);
        const depAcum = calcDepreciacionAcumulada(
          activo.valor_adquisicion,
          activo.vida_util_meses,
          periodo,
        );
        const valorNeto = calcValorNeto(activo.valor_adquisicion, depAcum);
        const precioAdq = !activo.valor_es_mercado ? activo.valor_adquisicion : null;
        const valorMercado = activo.valor_es_mercado ? activo.valor_adquisicion : null;
        const inactivo = activo.estado_registro === "DADO_DE_BAJA";
        const preregistrado = activo.estado_registro === "PREREGISTRADO";

        return (
          <article
            key={activo.id}
            className={`${panelCardClass} p-4 ${inactivo ? "opacity-60" : ""} ${
              preregistrado ? "border-amber-500/40 bg-amber-500/5" : ""
            }`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">
                  #{index + 1} · {categoriaBienCorto(activo.categoria)} ·{" "}
                  {preregistrado ? "Preregistrado" : formatCorrelativoDisplay(activo.correlativo)}
                </p>
                <h3 className="mt-1 text-base font-semibold leading-snug text-foreground">
                  {activo.nombre}
                </h3>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {activo.codigo_catalogo}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  activo.estado_bien === "BUENO"
                    ? "bg-emerald-100 text-emerald-700"
                    : activo.estado_bien === "REGULAR"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {estadoBienLabel(activo.estado_bien)}
              </span>
            </div>

            {descripcion && (
              <p className="mb-3 text-xs leading-snug text-muted-foreground">{descripcion}</p>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <InfoItem label="Fecha adq." value={formatFechaISOToDDMMYYYY(activo.fecha_adquisicion)} />
              <InfoItem
                label="Precio / Mercado"
                value={
                  precioAdq != null
                    ? `S/ ${formatMonedaPE(precioAdq)}`
                    : valorMercado != null
                      ? `Mercado S/ ${formatMonedaPE(valorMercado)}`
                      : undefined
                }
              />
              <InfoItem label="% Deprec." value={activo.depreciacion} />
              <InfoItem
                label="Valor neto"
                value={valorNeto != null ? `S/ ${formatMonedaPE(valorNeto)}` : undefined}
              />
            </div>

            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                CP:
              </span>
              <ComprobanteInline activo={activo} />
            </div>

            {activo.observacion?.trim() && (
              <p className="mt-3 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Obs: </span>
                {activo.observacion}
              </p>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
              <p className="text-xs text-muted-foreground">Acciones</p>
              <ActivoAccionesBar
                activo={activo}
                onEdit={onEditActivo}
                puedeDarDeBaja={puedeDarDeBaja}
                puedeValidarPreregistro={puedeValidarPreregistro}
                editarLabel={editarLabel}
                modoAdmin={modoAdmin}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}
