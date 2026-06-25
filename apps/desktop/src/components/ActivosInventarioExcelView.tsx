import { useEffect, useMemo, useState } from "react";
import type { Activo } from "@inventario/types";
import {
  formatActivoCodigoDisplay,
  formatFechaISOToCortoES,
  formatMonedaPE,
  categoriaBienLetra,
} from "@inventario/types";
import {
  ActivosInventarioTable,
  EstadoBienBadge,
  TablePagination,
  inventarioCuentaContable,
  inventarioDepreciacionFila,
  inventarioDescripcion,
  formatInventarioListaTexto,
  panelCardClass,
  panelDataCardsWrapClass,
  useTablePagination,
} from "@inventario/ui/panel";
import type { ActivoConUbicacion } from "../lib/activos";
import type { AmbienteDestinoNavigation } from "./AgregarBienesSimilaresDialog";
import { ActivosCampoAcciones } from "./ActivosCampoAcciones";
import { ComprobanteCell } from "./ComprobanteCell";
import { ComprobanteInline } from "./ComprobanteInline";

function puedeImprimirEtiqueta(activo: ActivoConUbicacion): boolean {
  return activo.estado_registro === "REGISTRADO" && Boolean(activo.codigo_barras);
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

function ActivosInventarioMobileCards({
  activos,
  entidadId,
  online,
  emptyMessage,
  onPrintLabel,
  onPrintBatch,
  onEditActivo,
  onIrAmbiente,
  onAbrirAmbienteDestino,
  onActivoUpdated,
  withSelection,
  selectedIds,
  onToggleSelect,
}: {
  activos: ActivoConUbicacion[];
  entidadId: string;
  online: boolean;
  emptyMessage?: string;
  onPrintLabel: (activo: ActivoConUbicacion) => void;
  onPrintBatch?: (activos: ActivoConUbicacion[]) => void;
  onEditActivo?: (activo: ActivoConUbicacion) => void;
  onIrAmbiente?: (activo: ActivoConUbicacion) => void;
  onAbrirAmbienteDestino?: (destino: AmbienteDestinoNavigation) => void;
  onActivoUpdated: (activo: ActivoConUbicacion) => void;
  withSelection?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}) {
  if (activos.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-sm text-muted-foreground">
        {emptyMessage ?? "No hay activos registrados."}
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
        const catLetra = categoriaBienLetra(activo.categoria);

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
              {withSelection && puedeImprimirEtiqueta(activo) && selectedIds && onToggleSelect && (
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 rounded border-input"
                  checked={selectedIds.has(activo.id)}
                  onChange={() => onToggleSelect(activo.id)}
                  aria-label={`Seleccionar ${activo.nombre}`}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">
                  #{index + 1} · {catLetra} ·{" "}
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
              <ActivosCampoAcciones
                entidadId={entidadId || activo.entidad_id}
                activo={activo}
                online={online}
                onPrintLabel={onPrintLabel}
                onPrintBatch={onPrintBatch}
                onEdit={onEditActivo}
                onIrAmbiente={onIrAmbiente}
                onAbrirAmbienteDestino={onAbrirAmbienteDestino}
                onValidated={onActivoUpdated}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}

interface ActivosInventarioExcelViewProps {
  activos: ActivoConUbicacion[];
  entidadId: string;
  online: boolean;
  emptyMessage?: string;
  mostrarPosibleAmbiente?: boolean;
  onPrintLabel: (activo: ActivoConUbicacion) => void;
  onActivoUpdated: (activo: ActivoConUbicacion) => void;
  onPrintBatch?: (activos: ActivoConUbicacion[]) => void;
  onEditActivo?: (activo: ActivoConUbicacion) => void;
  onIrAmbiente?: (activo: ActivoConUbicacion) => void;
  onAbrirAmbienteDestino?: (destino: AmbienteDestinoNavigation) => void;
  onSelectionChange?: (selected: ActivoConUbicacion[]) => void;
}

export function ActivosInventarioExcelView({
  activos,
  entidadId,
  online,
  emptyMessage = "No hay activos registrados.",
  mostrarPosibleAmbiente = false,
  onPrintLabel,
  onActivoUpdated,
  onPrintBatch,
  onEditActivo,
  onIrAmbiente,
  onAbrirAmbienteDestino,
  onSelectionChange,
}: ActivosInventarioExcelViewProps) {
  const withSelection = Boolean(onPrintBatch && !mostrarPosibleAmbiente);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const paginationKey = useMemo(
    () => `${activos.length}:${activos[0]?.id ?? ""}`,
    [activos],
  );
  const {
    paginated,
    page,
    setPage,
    totalPages,
    total,
    rangeStart,
    rangeEnd,
    pageSize,
    rowOffset,
  } = useTablePagination(activos, paginationKey);

  const printableOnPage = paginated.filter(puedeImprimirEtiqueta);
  const allPageSelected =
    printableOnPage.length > 0 && printableOnPage.every((a) => selectedIds.has(a.id));

  useEffect(() => {
    if (!onSelectionChange) return;
    const selected = activos.filter((a) => selectedIds.has(a.id) && puedeImprimirEtiqueta(a));
    onSelectionChange(selected);
  }, [activos, selectedIds, onSelectionChange]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        for (const a of printableOnPage) next.delete(a.id);
      } else {
        for (const a of printableOnPage) next.add(a.id);
      }
      return next;
    });
  }

  return (
    <div className="w-full max-w-full overflow-x-clip rounded-xl border border-border/60 bg-card shadow-sm">
      <div className={panelDataCardsWrapClass}>
        <ActivosInventarioMobileCards
          activos={paginated}
          entidadId={entidadId}
          online={online}
          emptyMessage={emptyMessage}
          onPrintLabel={onPrintLabel}
          onPrintBatch={onPrintBatch}
          onEditActivo={onEditActivo}
          onIrAmbiente={onIrAmbiente}
          onAbrirAmbienteDestino={onAbrirAmbienteDestino}
          onActivoUpdated={onActivoUpdated}
          withSelection={withSelection}
          selectedIds={withSelection ? selectedIds : undefined}
          onToggleSelect={withSelection ? toggleSelect : undefined}
        />
      </div>

      <ActivosInventarioTable
        activos={activos}
        paginated={paginated}
        rowOffset={rowOffset}
        emptyMessage={emptyMessage}
        mostrarPosibleAmbiente={mostrarPosibleAmbiente}
        selection={
          withSelection
            ? {
                withSelection: true,
                selectedIds,
                printableOnPage,
                allPageSelected,
                onToggleSelect: toggleSelect,
                onToggleSelectAllPage: toggleSelectAllPage,
                puedeImprimir: puedeImprimirEtiqueta,
              }
            : undefined
        }
        renderComprobante={(activo) => <ComprobanteCell activo={activo} />}
        renderAcciones={(activo) => (
          <ActivosCampoAcciones
            entidadId={entidadId || activo.entidad_id}
            activo={activo}
            online={online}
            onPrintLabel={onPrintLabel}
            onPrintBatch={onPrintBatch}
            onEdit={onEditActivo}
            onIrAmbiente={onIrAmbiente}
            onAbrirAmbienteDestino={onAbrirAmbienteDestino}
            onValidated={onActivoUpdated}
            compact
            variant="icons"
          />
        )}
      />

      <TablePagination
        page={page}
        totalPages={totalPages}
        total={total}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </div>
  );
}
