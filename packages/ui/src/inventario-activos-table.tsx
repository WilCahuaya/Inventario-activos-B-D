"use client";

import type { ReactNode } from "react";
import type { Activo } from "@inventario/types";
import {
  categoriaBienCorto,
  formatMonedaPE,
} from "@inventario/types";
import {
  INVENTARIO_TABLE_COL_COUNT,
  INVENTARIO_TABLE_FULL_PREREGISTRO_COL_COUNT,
  inventarioTableColWidths,
  inventarioTableColWidthsFullPreregistro,
  inventarioTableMinWidthPx,
} from "./inventario-table-cols";
import {
  EstadoBienBadge,
  InventarioEstadoRegistroFilaHint,
  InventarioCodigoCellContent,
  InventarioFechaCell,
  InventarioTextCell,
  InventarioValorPaVmCell,
  ObservacionCell,
  inventarioCuentaContable,
  inventarioDepreciacionFila,
  inventarioDescripcion,
  inventarioTdAccionesClass,
  inventarioTdComprobanteClass,
  inventarioTdFechaClass,
  inventarioThAccent,
  inventarioThStd,
} from "./inventario-table-cells";
import {
  panelDataTableFullClass,
  panelDataTableWrapClass,
} from "./responsive-layout";

const tdBase =
  "max-w-0 overflow-hidden border-b border-r border-border/40 px-2.5 py-2 text-xs leading-snug text-foreground last:border-r-0";

function Colgroup({
  modoPreregistro,
  withSelection,
}: {
  modoPreregistro?: boolean;
  withSelection?: boolean;
}) {
  const widths = modoPreregistro
    ? inventarioTableColWidthsFullPreregistro({ withSelection })
    : inventarioTableColWidths({ withSelection });
  return (
    <colgroup>
      {widths.map((w, i) => (
        <col key={i} style={{ width: w, minWidth: w }} />
      ))}
    </colgroup>
  );
}

function Th({
  children,
  className,
  rowSpan,
  colSpan,
  multiline,
}: {
  children: ReactNode;
  className?: string;
  rowSpan?: number;
  colSpan?: number;
  multiline?: boolean;
}) {
  return (
    <th rowSpan={rowSpan} colSpan={colSpan} className={className ?? inventarioThStd}>
      <span
        className={
          multiline
            ? "block whitespace-normal text-[10px] leading-tight normal-case sm:text-[11px]"
            : "block truncate"
        }
      >
        {children}
      </span>
    </th>
  );
}

export interface InventarioSelectionProps {
  withSelection: boolean;
  selectedIds: Set<string>;
  printableOnPage: Activo[];
  allPageSelected: boolean;
  onToggleSelect: (id: string) => void;
  onToggleSelectAllPage: () => void;
  puedeImprimir?: (activo: Activo) => boolean;
}

export interface ActivosInventarioTableProps<T extends Activo> {
  activos: T[];
  paginated: T[];
  rowOffset: number;
  emptyMessage: string;
  selection?: InventarioSelectionProps;
  mostrarEstadoRegistro?: boolean;
  mostrarPosibleAmbiente?: boolean;
  renderComprobante: (activo: T) => ReactNode;
  renderAcciones: (activo: T) => ReactNode;
}

type ActivoConPosible = Activo & { posible_ambiente_nombre?: string };

function posibleAmbienteNombre(activo: Activo): string {
  return (activo as ActivoConPosible).posible_ambiente_nombre?.trim() || "—";
}

const inventarioActivosTableClass = "inventario-activos-table";

function rowClassName(activo: Activo, rowIndex: number): string {
  const inactivo = activo.estado_registro === "DADO_DE_BAJA";
  const preregistrado = activo.estado_registro === "PREREGISTRADO";
  const zebra = rowIndex % 2 === 0 ? "inventario-row-even" : "inventario-row-odd";

  if (inactivo) return `inventario-table-row inventario-row-inactivo ${zebra}`;
  if (preregistrado) return `inventario-table-row inventario-row-prereg ${zebra}`;
  return `inventario-table-row ${zebra}`;
}

function SelectionHeader({
  selection,
  rowSpan = 2,
}: {
  selection: InventarioSelectionProps;
  rowSpan?: number;
}) {
  return (
    <th rowSpan={rowSpan} className={`${inventarioThStd} normal-case`}>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-input"
        checked={selection.allPageSelected}
        disabled={selection.printableOnPage.length === 0}
        onChange={selection.onToggleSelectAllPage}
        aria-label="Seleccionar página"
      />
    </th>
  );
}

function SelectionCell<T extends Activo>({
  activo,
  selection,
}: {
  activo: T;
  selection: InventarioSelectionProps;
}) {
  const puede =
    selection.puedeImprimir?.(activo) ??
    (activo.estado_registro === "REGISTRADO" && Boolean(activo.codigo_barras));

  return (
    <td className={`${tdBase} text-center`}>
      {puede ? (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          checked={selection.selectedIds.has(activo.id)}
          onChange={() => selection.onToggleSelect(activo.id)}
          aria-label={`Seleccionar ${activo.nombre}`}
        />
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </td>
  );
}

function CuentaContableCell<T extends Activo>({ activo }: { activo: T }) {
  const texto = inventarioCuentaContable(activo);
  return (
    <InventarioTextCell title={texto} lineClamp2>
      {texto !== "—" ? texto : ""}
    </InventarioTextCell>
  );
}

function FullTableBody<T extends Activo>({
  activos,
  paginated,
  rowOffset,
  emptyMessage,
  colSpan,
  selection,
  mostrarEstadoRegistro,
  mostrarPosibleAmbiente,
  renderComprobante,
  renderAcciones,
}: ActivosInventarioTableProps<T> & { colSpan: number }) {
  const modoPreregistro = Boolean(mostrarPosibleAmbiente);

  return (
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
        const descripcion = inventarioDescripcion(activo);
        const inactivo = activo.estado_registro === "DADO_DE_BAJA";
        const { periodo, depAcum, valorNeto } = inventarioDepreciacionFila(activo, inactivo);

        return (
          <tr key={activo.id} className={rowClassName(activo, rowIndex)}>
            {selection?.withSelection && <SelectionCell activo={activo} selection={selection} />}
            <InventarioTextCell center>{rowIndex + 1}</InventarioTextCell>
            <InventarioTextCell center>{categoriaBienCorto(activo.categoria)}</InventarioTextCell>
            <td className={`${tdBase} text-center`}>
              <InventarioCodigoCellContent activo={activo} />
            </td>
            <InventarioTextCell title={activo.nombre} lineClamp2>
              <span className={inactivo ? "line-through decoration-red-400/60" : undefined}>
                {activo.nombre}
              </span>
              <InventarioEstadoRegistroFilaHint
                activo={activo}
                mostrarPreregistro={mostrarEstadoRegistro && !modoPreregistro}
              />
            </InventarioTextCell>
            {modoPreregistro && (
              <InventarioTextCell title={posibleAmbienteNombre(activo)} lineClamp2>
                {posibleAmbienteNombre(activo)}
              </InventarioTextCell>
            )}
            <InventarioTextCell title={descripcion} lineClamp2>
              {descripcion}
            </InventarioTextCell>
            <InventarioFechaCell fecha={activo.fecha_adquisicion} />
            <CuentaContableCell activo={activo} />
            <td className={`${tdBase} text-center`}>
              <EstadoBienBadge estado={activo.estado_bien} />
            </td>
            <InventarioValorPaVmCell activo={activo} />
            <InventarioTextCell center>
              {activo.depreciacion?.trim() || ""}
            </InventarioTextCell>
            <InventarioTextCell center className="tabular-nums">
              {periodo > 0 ? String(Math.round(periodo)) : ""}
            </InventarioTextCell>
            <InventarioTextCell className="text-right tabular-nums">
              {depAcum != null ? `S/ ${formatMonedaPE(depAcum)}` : ""}
            </InventarioTextCell>
            <InventarioTextCell className="text-right tabular-nums font-semibold text-primary">
              {valorNeto != null ? `S/ ${formatMonedaPE(valorNeto)}` : ""}
            </InventarioTextCell>
            <ObservacionCell observacion={activo.observacion} lineClamp2 />
            {renderComprobante(activo)}
            <td className={inventarioTdAccionesClass}>
              <div className="flex flex-nowrap items-center justify-center gap-0.5">
                {renderAcciones(activo)}
              </div>
            </td>
          </tr>
        );
      })}
    </tbody>
  );
}

export function ActivosInventarioTable<T extends Activo>(props: ActivosInventarioTableProps<T>) {
  const { selection, mostrarPosibleAmbiente } = props;
  const modoPreregistro = Boolean(mostrarPosibleAmbiente);
  const withSelection = selection?.withSelection ?? false;
  const colSpan =
    (modoPreregistro ? INVENTARIO_TABLE_FULL_PREREGISTRO_COL_COUNT : INVENTARIO_TABLE_COL_COUNT) +
    (withSelection ? 1 : 0);
  const tableClass = `${inventarioActivosTableClass}${modoPreregistro ? " inventario-activos-table--preregistro" : ""}`;
  const tableMinWidth = inventarioTableMinWidthPx({ modoPreregistro, withSelection });

  return (
    <div className={panelDataTableWrapClass}>
      <div className={panelDataTableFullClass}>
        <table
          className={`${tableClass} table-fixed border-collapse`}
          style={{ minWidth: tableMinWidth, width: tableMinWidth }}
        >
          <Colgroup modoPreregistro={modoPreregistro} withSelection={withSelection} />
          <thead className="sticky top-0 z-10 border-b border-border/60 bg-card">
            <tr>
              {withSelection && selection && <SelectionHeader selection={selection} />}
              <Th rowSpan={2} className={`${inventarioThStd} normal-case`}>
                N°
              </Th>
              <Th rowSpan={2}>Cat.</Th>
              <Th rowSpan={2}>Código</Th>
              <Th rowSpan={2} className={`${inventarioThStd} normal-case`}>
                Nombre
              </Th>
              {modoPreregistro && (
                <Th rowSpan={2} multiline className={`${inventarioThStd} normal-case`}>
                  Pos. ambiente
                </Th>
              )}
              <Th rowSpan={2} className={`${inventarioThStd} normal-case`}>
                Descripción
              </Th>
              <Th rowSpan={2} className={`${inventarioThStd} whitespace-nowrap`}>
                Fecha
              </Th>
              <Th rowSpan={2} multiline className={`${inventarioThStd} normal-case`}>
                Cuenta
              </Th>
              <Th rowSpan={2}>Estado</Th>
              <Th rowSpan={2} multiline>
                PA / VM
              </Th>
              <Th colSpan={4} className={inventarioThAccent}>
                Depreciación
              </Th>
              <Th rowSpan={2} className={`${inventarioThStd} normal-case`}>
                Obs.
              </Th>
              <Th rowSpan={2} className={`${inventarioThStd} normal-case whitespace-nowrap`}>
                CP
              </Th>
              <Th rowSpan={2} className={`${inventarioThStd} whitespace-nowrap`}>
                Acciones
              </Th>
            </tr>
            <tr>
              <Th className={inventarioThAccent}>% Dep.</Th>
              <Th className={inventarioThAccent}>Per.</Th>
              <Th className={inventarioThAccent}>D. acum.</Th>
              <Th className={inventarioThAccent}>V. neto</Th>
            </tr>
          </thead>
          <FullTableBody {...props} colSpan={colSpan} />
        </table>
      </div>
    </div>
  );
}
