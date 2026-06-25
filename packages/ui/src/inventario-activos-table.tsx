"use client";

import type { ReactNode } from "react";
import type { Activo } from "@inventario/types";
import {
  categoriaBienCorto,
  formatMonedaPE,
} from "@inventario/types";
import {
  INVENTARIO_TABLE_COL_COUNT,
  INVENTARIO_TABLE_COMPACT_COL_COUNT,
  INVENTARIO_TABLE_FULL_PREREGISTRO_COL_COUNT,
  INVENTARIO_TABLE_PREREGISTRO_COL_COUNT,
  inventarioTableColWidths,
  inventarioTableColWidthsCompact,
  inventarioTableColWidthsFullPreregistro,
  inventarioTableColWidthsPreregistro,
} from "./inventario-table-cols";
import {
  CategoriaLetraCell,
  EstadoBienBadge,
  InventarioEstadoRegistroFilaHint,
  InventarioCodigoCellContent,
  InventarioFechaCell,
  InventarioTablaLeyenda,
  InventarioTextCell,
  ObservacionCell,
  ValorBienCell,
  ValorNetoCell,
  inventarioCuentaContable,
  inventarioDepreciacionFila,
  inventarioDescripcion,
  inventarioThAccent,
  inventarioThStd,
} from "./inventario-table-cells";
import {
  panelDataTableCompactClass,
  panelDataTableFullClass,
  panelDataTableWrapClass,
} from "./responsive-layout";

const tdBase =
  "max-w-0 overflow-hidden border-b border-r border-border/40 px-3 py-1.5 text-xs text-foreground last:border-r-0";

function Colgroup({
  compact,
  withSelection,
  modoPreregistro,
}: {
  compact: boolean;
  withSelection?: boolean;
  modoPreregistro?: boolean;
}) {
  const widths = modoPreregistro
    ? compact
      ? inventarioTableColWidthsPreregistro({ withSelection })
      : inventarioTableColWidthsFullPreregistro({ withSelection })
    : compact
      ? inventarioTableColWidthsCompact({ withSelection })
      : inventarioTableColWidths({ withSelection });
  return (
    <colgroup>
      {widths.map((w, i) => (
        <col key={i} style={{ width: w }} />
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
    <InventarioTextCell title={texto} className="text-[10px]">
      {texto !== "—" ? texto : ""}
    </InventarioTextCell>
  );
}

function CompactTableBody<T extends Activo>({
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

        return (
          <tr key={activo.id} className={rowClassName(activo, rowIndex)}>
            {selection?.withSelection && <SelectionCell activo={activo} selection={selection} />}
            <InventarioTextCell center>{rowIndex + 1}</InventarioTextCell>
            <CategoriaLetraCell categoria={activo.categoria} />
            <td className={`${tdBase} text-center`}>
              <InventarioCodigoCellContent activo={activo} />
            </td>
            <InventarioTextCell title={activo.nombre} lineClamp2={modoPreregistro}>
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
            <InventarioTextCell title={descripcion} lineClamp2={modoPreregistro} className="text-[10px]">
              {descripcion}
            </InventarioTextCell>
            <InventarioFechaCell fecha={activo.fecha_adquisicion} />
            <CuentaContableCell activo={activo} />
            <td className={`${tdBase} text-center`}>
              <EstadoBienBadge estado={activo.estado_bien} />
            </td>
            <ValorBienCell activo={activo} />
            {!modoPreregistro && <ValorNetoCell activo={activo} inactivo={inactivo} />}
            <ObservacionCell observacion={activo.observacion} lineClamp2={modoPreregistro} />
            {!modoPreregistro && renderComprobante(activo)}
            <td className={`${tdBase} overflow-visible last:border-r-0`}>
              {renderAcciones(activo)}
            </td>
          </tr>
        );
      })}
    </tbody>
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
        const precioAdq = !activo.valor_es_mercado ? activo.valor_adquisicion : null;
        const valorMercado = activo.valor_es_mercado ? activo.valor_adquisicion : null;
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
            <InventarioTextCell title={activo.nombre} lineClamp2={modoPreregistro}>
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
            <InventarioTextCell title={descripcion} lineClamp2={modoPreregistro} className="text-[10px]">
              {descripcion}
            </InventarioTextCell>
            <InventarioFechaCell fecha={activo.fecha_adquisicion} />
            <CuentaContableCell activo={activo} />
            <td className={`${tdBase} text-center`}>
              <EstadoBienBadge estado={activo.estado_bien} />
            </td>
            <InventarioTextCell className="text-right tabular-nums text-[11px]">
              {precioAdq != null ? `S/ ${formatMonedaPE(precioAdq)}` : ""}
            </InventarioTextCell>
            <InventarioTextCell className="text-right tabular-nums text-[11px]">
              {valorMercado != null ? `S/ ${formatMonedaPE(valorMercado)}` : ""}
            </InventarioTextCell>
            {!modoPreregistro && (
              <>
                <InventarioTextCell center className="text-[10px]">
                  {activo.depreciacion?.trim() || ""}
                </InventarioTextCell>
                <InventarioTextCell center className="text-[10px] tabular-nums">
                  {periodo > 0 ? String(Math.round(periodo)) : ""}
                </InventarioTextCell>
                <InventarioTextCell className="text-right text-[10px] tabular-nums">
                  {depAcum != null ? `S/ ${formatMonedaPE(depAcum)}` : ""}
                </InventarioTextCell>
                <InventarioTextCell className="text-right text-[10px] tabular-nums font-semibold text-primary">
                  {valorNeto != null ? `S/ ${formatMonedaPE(valorNeto)}` : ""}
                </InventarioTextCell>
              </>
            )}
            <ObservacionCell observacion={activo.observacion} lineClamp2={modoPreregistro} />
            {!modoPreregistro && renderComprobante(activo)}
            <td className={`${tdBase} overflow-visible last:border-r-0`}>
              {renderAcciones(activo)}
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
  const compactColSpan =
    (modoPreregistro ? INVENTARIO_TABLE_PREREGISTRO_COL_COUNT : INVENTARIO_TABLE_COMPACT_COL_COUNT) +
    (withSelection ? 1 : 0);
  const fullColSpan =
    (modoPreregistro ? INVENTARIO_TABLE_FULL_PREREGISTRO_COL_COUNT : INVENTARIO_TABLE_COL_COUNT) +
    (withSelection ? 1 : 0);
  const tableClass = `${inventarioActivosTableClass}${modoPreregistro ? " inventario-activos-table--preregistro" : ""}`;

  return (
    <div className={panelDataTableWrapClass}>
      <div className={panelDataTableCompactClass}>
        <table className={`${tableClass} min-w-0 w-full max-w-full table-fixed border-collapse`}>
          <Colgroup compact modoPreregistro={modoPreregistro} withSelection={withSelection} />
          <thead className="sticky top-0 z-10 border-b border-border/60 bg-card">
            <tr>
              {withSelection && selection && (
                <SelectionHeader selection={selection} rowSpan={1} />
              )}
              <Th>N°</Th>
              <Th>Cat.</Th>
              <Th>Código</Th>
              <Th multiline className={`${inventarioThStd} normal-case`}>
                Nombre del bien
              </Th>
              {modoPreregistro && (
                <Th multiline className={`${inventarioThStd} normal-case`}>
                  Posible ambiente
                </Th>
              )}
              <Th multiline className={`${inventarioThStd} normal-case`}>
                Descripción
              </Th>
              <Th multiline>Fecha adq.</Th>
              <Th multiline className={`${inventarioThStd} normal-case`}>
                Cuenta contable
              </Th>
              <Th>Estado</Th>
              <Th>Precio</Th>
              {!modoPreregistro && (
                <Th multiline className={`${inventarioThStd} normal-case`}>
                  Valor neto
                </Th>
              )}
              <Th multiline className={`${inventarioThStd} normal-case`}>
                Observación
              </Th>
              {!modoPreregistro && (
                <Th className={`${inventarioThStd} normal-case`}>CP</Th>
              )}
              <Th>Acciones</Th>
            </tr>
          </thead>
          <CompactTableBody {...props} colSpan={compactColSpan} />
        </table>
        <InventarioTablaLeyenda />
      </div>

      <div className={panelDataTableFullClass}>
        <table
          className={`${tableClass} w-full table-fixed border-collapse ${
            modoPreregistro ? "min-w-0 3xl:min-w-0" : "min-w-[1760px] 3xl:min-w-0"
          }`}
        >
          <Colgroup compact={false} modoPreregistro={modoPreregistro} withSelection={withSelection} />
          <thead className="sticky top-0 z-10 border-b border-border/60 bg-card">
            {modoPreregistro ? (
              <tr>
                {withSelection && selection && <SelectionHeader selection={selection} />}
                <Th rowSpan={1} className={`${inventarioThStd} normal-case`}>
                  N°
                </Th>
                <Th rowSpan={1}>Cat.</Th>
                <Th rowSpan={1}>Código</Th>
                <Th rowSpan={1} multiline className={`${inventarioThStd} normal-case`}>
                  Nombre del bien
                </Th>
                <Th rowSpan={1} multiline className={`${inventarioThStd} normal-case`}>
                  Posible ambiente
                </Th>
                <Th rowSpan={1} multiline className={`${inventarioThStd} normal-case`}>
                  Descripción
                </Th>
                <Th rowSpan={1} multiline>
                  Fecha adq.
                </Th>
                <Th rowSpan={1} multiline className={`${inventarioThStd} normal-case`}>
                  Cuenta contable
                </Th>
                <Th rowSpan={1}>Estado</Th>
                <Th rowSpan={1}>Precio adq.</Th>
                <Th rowSpan={1}>V. mercado</Th>
                <Th rowSpan={1} multiline className={`${inventarioThStd} normal-case`}>
                  Observación
                </Th>
                <Th rowSpan={1}>Acciones</Th>
              </tr>
            ) : (
              <>
                <tr>
                  {withSelection && selection && <SelectionHeader selection={selection} />}
                  <Th rowSpan={2} className={`${inventarioThStd} normal-case`}>
                    N°
                  </Th>
                  <Th rowSpan={2}>Cat.</Th>
                  <Th rowSpan={2}>Código</Th>
                  <Th rowSpan={2} className={`${inventarioThStd} normal-case`}>
                    Nombre del bien
                  </Th>
                  <Th rowSpan={2} className={`${inventarioThStd} normal-case`}>
                    Descripción
                  </Th>
                  <Th rowSpan={2}>Fecha adq.</Th>
                  <Th rowSpan={2} multiline className={`${inventarioThStd} normal-case`}>
                    Cuenta contable
                  </Th>
                  <Th rowSpan={2}>Estado</Th>
                  <Th rowSpan={2}>Precio adq.</Th>
                  <Th rowSpan={2}>V. mercado</Th>
                  <Th colSpan={4} className={inventarioThAccent}>
                    Depreciación y valor neto
                  </Th>
                  <Th rowSpan={2} className={`${inventarioThStd} normal-case`}>
                    Observación
                  </Th>
                  <Th rowSpan={2} className={`${inventarioThStd} normal-case`}>
                    CP
                  </Th>
                  <Th rowSpan={2}>Acciones</Th>
                </tr>
                <tr>
                  <Th className={inventarioThAccent}>% Deprec.</Th>
                  <Th className={inventarioThAccent}>Periodo</Th>
                  <Th className={inventarioThAccent}>Dep. acum.</Th>
                  <Th className={inventarioThAccent}>Valor neto</Th>
                </tr>
              </>
            )}
          </thead>
          <FullTableBody {...props} colSpan={fullColSpan} />
        </table>
      </div>
    </div>
  );
}
