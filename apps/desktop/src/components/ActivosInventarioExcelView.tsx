import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { TablePagination, INVENTARIO_TABLE_COL_COUNT, inventarioTableColWidths, panelCardClass, useTablePagination } from "@inventario/ui/panel";
import type { ActivoConUbicacion } from "../lib/activos";
import { ActivosCampoAcciones } from "./ActivosCampoAcciones";
import { ActivosCampoAccionesCell } from "./ActivosCampoAccionesCell";
import { ComprobanteCell } from "./ComprobanteCell";
import { ComprobanteInline } from "./ComprobanteInline";

const COLS = INVENTARIO_TABLE_COL_COUNT;

const thBase =
  "max-w-0 overflow-hidden border-b border-r border-border/50 px-1 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide last:border-r-0";
const thStd = `${thBase} bg-muted/50 text-foreground/80`;
const thAccent = `${thBase} bg-primary/10 text-primary`;
const tdBase =
  "max-w-0 overflow-hidden border-b border-r border-border/40 px-1 py-1.5 text-xs text-foreground last:border-r-0";
const tdMuted = "text-muted-foreground";

function Cell({ children, center, className, title }: { children?: ReactNode; center?: boolean; className?: string; title?: string }) {
  const text = children === null || children === undefined || children === "" ? "—" : children;
  return (
    <td
      className={`${tdBase} ${center ? "text-center" : ""} ${className ?? ""}`}
      title={title}
    >
      <span className={`block truncate ${text === "—" ? tdMuted : ""}`}>{text}</span>
    </td>
  );
}

function puedeImprimirEtiqueta(activo: ActivoConUbicacion): boolean {
  return activo.estado_registro === "REGISTRADO" && Boolean(activo.codigo_barras);
}

function InventarioColgroup({ withSelection }: { withSelection?: boolean }) {
  const widths = inventarioTableColWidths({ withSelection });
  return (
    <colgroup>
      {widths.map((w, i) => (
        <col key={i} style={{ width: w }} />
      ))}
    </colgroup>
  );
}

interface ActivosInventarioExcelViewProps {
  activos: ActivoConUbicacion[];
  entidadId: string;
  online: boolean;
  emptyMessage?: string;
  onOpenFicha: (activo: ActivoConUbicacion) => void;
  onPrintLabel: (activo: ActivoConUbicacion) => void;
  onActivoUpdated: (activo: ActivoConUbicacion) => void;
  onPrintBatch?: (activos: ActivoConUbicacion[]) => void;
  onSelectionChange?: (selected: ActivoConUbicacion[]) => void;
}

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-sm text-foreground">{value?.trim() || "—"}</p>
    </div>
  );
}

function ActivosInventarioMobileCards({
  activos,
  entidadId,
  online,
  emptyMessage,
  onOpenFicha,
  onPrintLabel,
  onActivoUpdated,
  withSelection,
  selectedIds,
  onToggleSelect,
}: {
  activos: ActivoConUbicacion[];
  entidadId: string;
  online: boolean;
  emptyMessage?: string;
  onOpenFicha: (activo: ActivoConUbicacion) => void;
  onPrintLabel: (activo: ActivoConUbicacion) => void;
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
        const descripcion = buildDescripcionBien(
          activo.marca,
          activo.modelo,
          activo.serie,
          activo.color,
          activo.medidas,
        );
        const inactivo = activo.estado_registro === "DADO_DE_BAJA";
        const periodo = calcPeriodoMeses(activo.fecha_adquisicion);
        const depAcum = calcDepreciacionAcumulada(
          activo.valor_adquisicion,
          activo.vida_util_meses,
          periodo,
          inactivo,
        );
        const valorNeto = calcValorNeto(activo.valor_adquisicion, depAcum, inactivo);
        const precioAdq = !activo.valor_es_mercado ? activo.valor_adquisicion : null;
        const valorMercado = activo.valor_es_mercado ? activo.valor_adquisicion : null;
        const preregistrado = activo.estado_registro === "PREREGISTRADO";

        return (
          <article
            key={activo.id}
            className={`${panelCardClass} p-4 ${inactivo ? "opacity-60" : ""} ${
              preregistrado ? "border-amber-500/40 bg-amber-500/5" : ""
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
              <ActivosCampoAcciones
                entidadId={entidadId || activo.entidad_id}
                activo={activo}
                online={online}
                onOpenFicha={onOpenFicha}
                onPrintLabel={onPrintLabel}
                onValidated={onActivoUpdated}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function ActivosInventarioExcelView({
  activos,
  entidadId,
  online,
  emptyMessage = "No hay activos registrados.",
  onOpenFicha,
  onPrintLabel,
  onActivoUpdated,
  onPrintBatch,
  onSelectionChange,
}: ActivosInventarioExcelViewProps) {
  const withSelection = Boolean(onPrintBatch);
  const colSpan = withSelection ? COLS + 1 : COLS;
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
        <div className="lg:hidden">
          <ActivosInventarioMobileCards
            activos={paginated}
            entidadId={entidadId}
            online={online}
            emptyMessage={emptyMessage}
            onOpenFicha={onOpenFicha}
            onPrintLabel={onPrintLabel}
            onActivoUpdated={onActivoUpdated}
            withSelection={withSelection}
            selectedIds={withSelection ? selectedIds : undefined}
            onToggleSelect={withSelection ? toggleSelect : undefined}
          />
        </div>

        <div className="hidden w-full max-w-full lg:block">
          <table className="w-full max-w-full table-fixed border-collapse">
            <InventarioColgroup withSelection={withSelection} />
            <thead className="sticky top-0 z-10 bg-card shadow-sm">
              <tr>
                {withSelection && (
                  <th rowSpan={2} className={`${thStd} normal-case`}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      checked={allPageSelected}
                      disabled={printableOnPage.length === 0}
                      onChange={toggleSelectAllPage}
                      aria-label="Seleccionar página para impresión"
                    />
                  </th>
                )}
                <th rowSpan={2} className={`${thStd} normal-case`}>
                  <span className="block truncate">N°</span>
                </th>
                <th rowSpan={2} className={thStd}>
                  <span className="block truncate">Cat.</span>
                </th>
                <th rowSpan={2} className={thStd}>
                  <span className="block truncate">Código</span>
                </th>
                <th rowSpan={2} className={thStd}>
                  <span className="block truncate">Corr.</span>
                </th>
                <th rowSpan={2} className={`${thStd} normal-case`}>
                  <span className="block truncate">Nombre del bien</span>
                </th>
                <th rowSpan={2} className={`${thStd} normal-case`}>
                  <span className="block truncate">Descripción</span>
                </th>
                <th rowSpan={2} className={thStd}>
                  <span className="block truncate">Fecha adq.</span>
                </th>
                <th rowSpan={2} className={thStd}>
                  <span className="block truncate">Estado</span>
                </th>
                <th rowSpan={2} className={thStd}>
                  <span className="block truncate">Precio adq.</span>
                </th>
                <th rowSpan={2} className={thStd}>
                  <span className="block truncate">V. mercado</span>
                </th>
                <th colSpan={4} className={thAccent}>
                  <span className="block truncate">Depreciación y valor neto</span>
                </th>
                <th rowSpan={2} className={`${thStd} normal-case`}>
                  <span className="block truncate">Observación</span>
                </th>
                <th rowSpan={2} className={`${thStd} normal-case`}>
                  <span className="block truncate">CP</span>
                </th>
                <th rowSpan={2} className={thStd}>
                  <span className="block truncate">Acciones</span>
                </th>
              </tr>
              <tr>
                <th className={`${thAccent} max-w-0`}>
                  <span className="block truncate">% Deprec.</span>
                </th>
                <th className={`${thAccent} max-w-0`}>
                  <span className="block truncate">Periodo</span>
                </th>
                <th className={`${thAccent} max-w-0`}>
                  <span className="block truncate">Dep. acum.</span>
                </th>
                <th className={`${thAccent} max-w-0`}>
                  <span className="block truncate">Valor neto</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {activos.length === 0 && (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              )}
              {paginated.map((activo, index) => {
                const rowIndex = rowOffset + index;
                const descripcion = buildDescripcionBien(
                  activo.marca,
                  activo.modelo,
                  activo.serie,
                  activo.color,
                  activo.medidas,
                );
                const precioAdq = !activo.valor_es_mercado ? activo.valor_adquisicion : null;
                const valorMercado = activo.valor_es_mercado ? activo.valor_adquisicion : null;
                const precioStr = precioAdq != null ? `S/ ${formatMonedaPE(precioAdq)}` : "";
                const mercadoStr = valorMercado != null ? `S/ ${formatMonedaPE(valorMercado)}` : "";
                const inactivo = activo.estado_registro === "DADO_DE_BAJA";
                const periodo = calcPeriodoMeses(activo.fecha_adquisicion);
                const depAcum = calcDepreciacionAcumulada(
                  activo.valor_adquisicion,
                  activo.vida_util_meses,
                  periodo,
                  inactivo,
                );
                const valorNeto = calcValorNeto(activo.valor_adquisicion, depAcum, inactivo);
                const preregistrado = activo.estado_registro === "PREREGISTRADO";
                const rowClass = inactivo
                  ? "bg-muted/40 opacity-60"
                  : preregistrado
                    ? "bg-amber-500/10 hover:bg-amber-500/15"
                    : rowIndex % 2 === 0
                      ? "bg-card"
                      : "bg-muted/20 hover:bg-muted/30";

                return (
                  <tr key={activo.id} className={rowClass}>
                    {withSelection && (
                      <td className={`${tdBase} text-center`}>
                        {puedeImprimirEtiqueta(activo) ? (
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-input"
                            checked={selectedIds.has(activo.id)}
                            onChange={() => toggleSelect(activo.id)}
                            aria-label={`Seleccionar ${activo.nombre}`}
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    )}
                    <Cell center>{rowIndex + 1}</Cell>
                    <Cell center>{categoriaBienCorto(activo.categoria)}</Cell>
                    <Cell center title={activo.codigo_catalogo}>
                      <span className="block truncate font-mono text-[10px] leading-tight">
                        {activo.codigo_catalogo}
                      </span>
                    </Cell>
                    <td className={`${tdBase} text-center`}>
                      {preregistrado ? (
                        <span className="inline-block max-w-full truncate rounded bg-amber-500/20 px-1 py-0.5 text-[9px] font-semibold uppercase text-amber-800 dark:text-amber-200">
                          Prereg.
                        </span>
                      ) : (
                        <span className="block truncate">
                          {formatCorrelativoDisplay(activo.correlativo)}
                        </span>
                      )}
                    </td>
                    <Cell className="text-[11px] leading-snug" title={activo.nombre}>
                      <span className="block truncate">{activo.nombre}</span>
                      {preregistrado && (
                        <span className="mt-0.5 block truncate text-[9px] font-medium uppercase text-amber-700 dark:text-amber-300">
                          Pendiente de validación
                        </span>
                      )}
                    </Cell>
                    <Cell className="text-[10px] leading-snug" title={descripcion}>
                      <span className="block truncate">{descripcion}</span>
                    </Cell>
                    <Cell center className="text-[11px]">
                      {formatFechaISOToDDMMYYYY(activo.fecha_adquisicion)}
                    </Cell>
                    <Cell center className="text-[11px]">
                      {estadoBienLabel(activo.estado_bien)}
                    </Cell>
                    <Cell className="text-right text-[11px] tabular-nums">{precioStr}</Cell>
                    <Cell className="text-right text-[11px] tabular-nums">{mercadoStr}</Cell>
                    <Cell center className="text-[10px]">
                      {activo.depreciacion?.trim() || "—"}
                    </Cell>
                    <Cell center className="text-[10px] tabular-nums">
                      {periodo > 0 ? periodo.toFixed(2).replace(".", ",") : "—"}
                    </Cell>
                    <Cell className="text-right text-[10px] tabular-nums">
                      {depAcum != null ? `S/ ${formatMonedaPE(depAcum)}` : "—"}
                    </Cell>
                    <Cell className="text-right text-[10px] tabular-nums">
                      {valorNeto != null ? `S/ ${formatMonedaPE(valorNeto)}` : "—"}
                    </Cell>
                    <td className={`${tdBase} max-w-0`}>
                      <span
                        className="block truncate text-[10px]"
                        title={activo.observacion?.trim() || undefined}
                      >
                        {activo.observacion?.trim() || "—"}
                      </span>
                    </td>
                    <ComprobanteCell activo={activo} />
                    <ActivosCampoAccionesCell
                      entidadId={entidadId || activo.entidad_id}
                      activo={activo}
                      online={online}
                      onOpenFicha={onOpenFicha}
                      onPrintLabel={onPrintLabel}
                      onActivoUpdated={onActivoUpdated}
                    />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

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
