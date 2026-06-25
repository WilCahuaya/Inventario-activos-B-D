"use client";

import type { Activo } from "@inventario/types";
import {
  formatActivoCodigoDisplay,
  formatFechaISOToCortoES,
  formatMonedaPE,
  categoriaBienLetra,
} from "@inventario/types";
import {
  EstadoBienBadge,
  formatInventarioListaTexto,
  inventarioCuentaContable,
  inventarioDepreciacionFila,
  inventarioDescripcion,
} from "@inventario/ui/panel";
import { ActivoAccionesBar } from "./ActivoAccionesBar";
import { ComprobanteInline } from "./ComprobanteInline";
import { panelCardClass } from "./panel-ui";

interface ActivosInventarioMobileCardsProps {
  activos: Activo[];
  onEditActivo: (activo: Activo) => void;
  onIrAmbiente?: (activo: Activo) => void;
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

function ValorCardItem({ activo }: { activo: Activo }) {
  const esMercado = activo.valor_es_mercado;
  const monto = activo.valor_adquisicion;
  if (monto == null) return <InfoItem label="Precio" />;
  const etiqueta = esMercado ? "VM" : "PA";
  return (
    <InfoItem label="Precio" value={`${etiqueta} S/ ${formatMonedaPE(monto)}`} />
  );
}

export function ActivosInventarioMobileCards({
  activos,
  onEditActivo,
  onIrAmbiente,
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
        const descripcion = inventarioDescripcion(activo);
        const inactivo = activo.estado_registro === "DADO_DE_BAJA";
        const { valorNeto } = inventarioDepreciacionFila(activo, inactivo);
        const preregistrado = activo.estado_registro === "PREREGISTRADO";

        return (
          <article
            key={activo.id}
            className={`${panelCardClass} p-4 ${
              inactivo
                ? "border-red-500/40 bg-red-500/5"
                : preregistrado
                  ? "border-amber-500/40 bg-amber-500/5"
                  : ""
            }`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">
                  #{index + 1} · {categoriaBienLetra(activo.categoria)} ·{" "}
                  {inactivo
                    ? "Dado de baja"
                    : preregistrado
                      ? "Preregistrado"
                      : formatActivoCodigoDisplay(activo)}
                </p>
                <h3
                  className={`mt-1 text-base font-semibold leading-snug text-foreground ${
                    inactivo ? "line-through decoration-red-400/60" : ""
                  }`}
                >
                  {activo.nombre}
                </h3>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {formatActivoCodigoDisplay(activo)}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {inventarioCuentaContable(activo)}
                </p>
              </div>
              <EstadoBienBadge estado={activo.estado_bien} />
            </div>

            {descripcion && (
              <p className="mb-3 text-xs leading-snug text-muted-foreground">{descripcion}</p>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <InfoItem
                label="Fecha adq."
                value={formatFechaISOToCortoES(activo.fecha_adquisicion)}
              />
              <ValorCardItem activo={activo} />
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
                {formatInventarioListaTexto(activo.observacion)}
              </p>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
              <p className="text-xs text-muted-foreground">Acciones</p>
              <ActivoAccionesBar
                activo={activo}
                onEdit={onEditActivo}
                onIrAmbiente={onIrAmbiente}
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
