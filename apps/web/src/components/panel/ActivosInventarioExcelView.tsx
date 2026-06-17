"use client";

import { useMemo, type ReactNode } from "react";
import type { Activo } from "@inventario/types";
import { TablePagination, INVENTARIO_TABLE_COL_COUNT, inventarioTableColWidths, useTablePagination } from "@inventario/ui/panel";
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
import { ActivoAccionesCell } from "./ActivoAccionesCell";
import { ActivosInventarioMobileCards } from "./ActivosInventarioMobileCards";
import { ComprobanteCell } from "./ComprobanteCell";

const COLS = INVENTARIO_TABLE_COL_COUNT;

const thBase =
  "max-w-0 overflow-hidden border-b border-r border-border/50 px-1 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide last:border-r-0";
const thStd = `${thBase} bg-muted/50 text-foreground/80`;
const thAccent = `${thBase} bg-primary/10 text-primary`;
const tdBase =
  "max-w-0 overflow-hidden border-b border-r border-border/40 px-1 py-1.5 text-xs text-foreground last:border-r-0";

function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th className={`${className ?? thStd}`}>
      <span className="block truncate">{children}</span>
    </th>
  );
}

function InventarioColgroup() {
  const widths = inventarioTableColWidths();
  return (
    <colgroup>
      {widths.map((w, i) => (
        <col key={i} style={{ width: w }} />
      ))}
    </colgroup>
  );
}

const tdMuted = "text-muted-foreground";

function Cell({ children, center, className, title }: { children?: ReactNode; center?: boolean; className?: string; title?: string }) {
  const text = children === null || children === undefined || children === "" ? "—" : children;
  return (
    <td
      className={`${tdBase} max-w-0 overflow-hidden ${center ? "text-center" : ""} ${className ?? ""}`}
      title={title}
    >
      <span className={`block truncate ${text === "—" ? tdMuted : ""}`}>{text}</span>
    </td>
  );
}

interface ActivosInventarioExcelViewProps {
  activos: Activo[];
  onEditActivo: (activo: Activo) => void;
  onOpenFicha: (activo: Activo) => void;
  puedeDarDeBaja?: boolean;
  puedeValidarPreregistro?: boolean;
  editarLabel?: string;
  mostrarEstadoRegistro?: boolean;
  emptyActionLabel?: string;
  modoAdmin?: boolean;
}

/** Tabla inventario: ancho fijo 100 % del contenedor, sin scroll horizontal. */
export function ActivosInventarioExcelView({
  activos,
  onEditActivo,
  onOpenFicha,
  puedeDarDeBaja = true,
  puedeValidarPreregistro = false,
  editarLabel,
  mostrarEstadoRegistro = false,
  emptyActionLabel = "+ Nuevo activo",
  modoAdmin = false,
}: ActivosInventarioExcelViewProps) {
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

  const accionesProps = {
    puedeDarDeBaja,
    puedeValidarPreregistro,
    editarLabel,
    mostrarEstadoRegistro,
    emptyActionLabel,
    modoAdmin,
  };

  return (
    <div className="min-w-0 w-full max-w-full overflow-x-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="lg:hidden">
        <ActivosInventarioMobileCards
          activos={paginated}
          onEditActivo={onEditActivo}
          onOpenFicha={onOpenFicha}
          {...accionesProps}
        />
      </div>

      <div className="hidden min-w-0 w-full max-w-full overflow-x-hidden lg:block">
        <table className="min-w-0 w-full max-w-full table-fixed border-collapse">
          <InventarioColgroup />
          <thead className="sticky top-0 z-10 border-b border-border/60 bg-card">
            <tr>
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
              <Th className={thAccent}>% Deprec.</Th>
              <Th className={thAccent}>Periodo</Th>
              <Th className={thAccent}>Dep. acum.</Th>
              <Th className={thAccent}>Valor neto</Th>
            </tr>
          </thead>
          <tbody>
            {activos.length === 0 && (
              <tr>
                <td
                  colSpan={COLS}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  No hay activos registrados. Use «{emptyActionLabel}» para agregar el primero.
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
                    {mostrarEstadoRegistro && preregistrado && (
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
                  <Cell center className="text-[11px]">{estadoBienLabel(activo.estado_bien)}</Cell>
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
                  <ActivoAccionesCell
                    activo={activo}
                    onEdit={onEditActivo}
                    onOpenFicha={onOpenFicha}
                    {...accionesProps}
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
