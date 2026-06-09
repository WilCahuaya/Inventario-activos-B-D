"use client";

import { useMemo, type ReactNode } from "react";
import type { Activo } from "@inventario/types";
import { TablePagination, useTablePagination } from "@inventario/ui/panel";
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

const COLS = 19;

const thBase =
  "border-b border-r border-border/50 px-1.5 py-2 text-center text-[10px] font-semibold uppercase tracking-wide last:border-r-0 lg:px-2";
const thStd = `${thBase} bg-muted/50 text-foreground/80`;
const thAccent = `${thBase} bg-primary/10 text-primary`;
const tdBase =
  "border-b border-r border-border/40 px-1.5 py-2 text-xs text-foreground last:border-r-0 lg:px-2";
const tdMuted = "text-muted-foreground";

function Cell({ children, center, className }: { children?: ReactNode; center?: boolean; className?: string }) {
  const text = children === null || children === undefined || children === "" ? "—" : children;
  return (
    <td className={`${tdBase} ${center ? "text-center" : ""} ${className ?? ""}`}>
      <span className={text === "—" ? tdMuted : undefined}>{text}</span>
    </td>
  );
}

interface ActivosInventarioExcelViewProps {
  activos: Activo[];
  onEditActivo: (activo: Activo) => void;
  puedeDarDeBaja?: boolean;
  puedeValidarPreregistro?: boolean;
  editarLabel?: string;
  mostrarEstadoRegistro?: boolean;
  emptyActionLabel?: string;
  modoAdmin?: boolean;
}

/** Anchos relativos: suman 100 % del contenedor (table-fixed). */
function InventarioColgroup() {
  return (
    <colgroup>
      <col style={{ width: "2.5%" }} />
      <col style={{ width: "2.5%" }} />
      <col style={{ width: "2.5%" }} />
      <col style={{ width: "3%" }} />
      <col style={{ width: "5.5%" }} />
      <col style={{ width: "3.5%" }} />
      <col style={{ width: "11%" }} />
      <col style={{ width: "15.5%" }} />
      <col style={{ width: "5%" }} />
      <col style={{ width: "4.5%" }} />
      <col style={{ width: "5.5%" }} />
      <col style={{ width: "5.5%" }} />
      <col style={{ width: "4.5%" }} />
      <col style={{ width: "4.5%" }} />
      <col style={{ width: "6%" }} />
      <col style={{ width: "6%" }} />
      <col style={{ width: "8%" }} />
      <col style={{ width: "4.5%" }} />
      <col style={{ width: "5%" }} />
    </colgroup>
  );
}

export function ActivosInventarioExcelView({
  activos,
  onEditActivo,
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
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="lg:hidden">
        <ActivosInventarioMobileCards
          activos={paginated}
          onEditActivo={onEditActivo}
          {...accionesProps}
        />
      </div>

      <div className="hidden w-full lg:block">
        <table className="w-full table-fixed border-collapse">
          <InventarioColgroup />
          <thead className="sticky top-0 z-10 bg-card shadow-sm">
            <tr>
              <th rowSpan={2} className={`${thStd} normal-case`}>
                N°
              </th>
              <th rowSpan={2} className={thStd}>
                Cant.
              </th>
              <th rowSpan={2} className={thStd}>
                Und.
              </th>
              <th rowSpan={2} className={thStd}>
                Cat.
              </th>
              <th rowSpan={2} className={thStd}>
                Código
              </th>
              <th rowSpan={2} className={thStd}>
                Corr.
              </th>
              <th rowSpan={2} className={`${thStd} normal-case`}>
                Nombre del bien
              </th>
              <th rowSpan={2} className={`${thStd} normal-case`}>
                Descripción
              </th>
              <th rowSpan={2} className={thStd}>
                Fecha adq.
              </th>
              <th rowSpan={2} className={thStd}>
                Estado
              </th>
              <th rowSpan={2} className={thStd}>
                Precio adq.
              </th>
              <th rowSpan={2} className={thStd}>
                V. mercado
              </th>
              <th colSpan={4} className={thAccent}>
                Depreciación y valor neto
              </th>
              <th rowSpan={2} className={`${thStd} normal-case`}>
                Observación
              </th>
              <th rowSpan={2} className={`${thStd} normal-case`}>
                CP
              </th>
              <th rowSpan={2} className={thStd}>
                Acciones
              </th>
            </tr>
            <tr>
              <th className={thAccent}>% Deprec.</th>
              <th className={thAccent}>Periodo</th>
              <th className={thAccent}>Dep. acum.</th>
              <th className={thAccent}>Valor neto</th>
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
              const periodo = calcPeriodoMeses(activo.fecha_adquisicion);
              const depAcum = calcDepreciacionAcumulada(
                activo.valor_adquisicion,
                activo.vida_util_meses,
                periodo,
              );
              const valorNeto = calcValorNeto(activo.valor_adquisicion, depAcum);
              const inactivo = activo.estado_registro === "DADO_DE_BAJA";
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
                  <Cell center>1</Cell>
                  <Cell center>Und.</Cell>
                  <Cell center>{categoriaBienCorto(activo.categoria)}</Cell>
                  <Cell center>
                    <span className="break-all font-mono text-[10px] leading-tight">
                      {activo.codigo_catalogo}
                    </span>
                  </Cell>
                  <Cell center>
                    {preregistrado ? (
                      <span className="rounded bg-amber-500/20 px-1 py-0.5 text-[9px] font-semibold uppercase text-amber-800 dark:text-amber-200">
                        Prereg.
                      </span>
                    ) : (
                      formatCorrelativoDisplay(activo.correlativo)
                    )}
                  </Cell>
                  <Cell className="break-words text-[11px] leading-snug">
                    {activo.nombre}
                    {mostrarEstadoRegistro && preregistrado && (
                      <span className="mt-0.5 block text-[9px] font-medium uppercase text-amber-700 dark:text-amber-300">
                        Pendiente de validación
                      </span>
                    )}
                  </Cell>
                  <Cell className="break-words text-[10px] leading-snug">{descripcion}</Cell>
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
                  <Cell className="break-words text-[10px] leading-snug">{activo.observacion}</Cell>
                  <ComprobanteCell activo={activo} />
                  <ActivoAccionesCell activo={activo} onEdit={onEditActivo} {...accionesProps} />
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
