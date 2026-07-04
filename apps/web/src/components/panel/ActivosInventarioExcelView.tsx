"use client";

import { useMemo } from "react";
import type { Activo } from "@inventario/types";
import {
  ActivosInventarioTable,
  TablePagination,
  panelDataCardsWrapClass,
  scrollbarThemedClass,
  useTablePagination,
} from "@inventario/ui/panel";
import { ActivoAccionesBar } from "./ActivoAccionesBar";
import { ActivosInventarioMobileCards } from "./ActivosInventarioMobileCards";
import { ComprobanteCell } from "./ComprobanteCell";

interface ActivosInventarioExcelViewProps {
  activos: Activo[];
  onEditActivo: (activo: Activo) => void;
  onIrAmbiente?: (activo: Activo) => void;
  puedeDarDeBaja?: boolean;
  puedeValidarPreregistro?: boolean;
  editarLabel?: string;
  mostrarEstadoRegistro?: boolean;
  mostrarPosibleAmbiente?: boolean;
  emptyActionLabel?: string;
  modoAdmin?: boolean;
}

export function ActivosInventarioExcelView({
  activos,
  onEditActivo,
  onIrAmbiente,
  puedeDarDeBaja = true,
  puedeValidarPreregistro = false,
  editarLabel,
  mostrarEstadoRegistro = false,
  mostrarPosibleAmbiente = false,
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
    modoAdmin,
  };

  const emptyMessage =
    activos.length === 0
      ? `No hay activos registrados. Use «${emptyActionLabel}» para agregar el primero.`
      : "";

  return (
    <div
      className={`${scrollbarThemedClass} min-w-0 w-full max-w-full overflow-x-auto overflow-y-hidden rounded-xl border border-border/60 bg-card shadow-sm`}
    >
      <div className={panelDataCardsWrapClass}>
        <ActivosInventarioMobileCards
          activos={paginated}
          onEditActivo={onEditActivo}
          onIrAmbiente={onIrAmbiente}
          {...accionesProps}
          emptyActionLabel={emptyActionLabel}
          mostrarEstadoRegistro={mostrarEstadoRegistro}
        />
      </div>

      <ActivosInventarioTable
        activos={activos}
        paginated={paginated}
        rowOffset={rowOffset}
        emptyMessage={emptyMessage}
        mostrarEstadoRegistro={mostrarEstadoRegistro}
        mostrarPosibleAmbiente={mostrarPosibleAmbiente}
        renderComprobante={(activo) => <ComprobanteCell activo={activo} />}
        renderAcciones={(activo) => (
          <ActivoAccionesBar
            activo={activo}
            onEdit={onEditActivo}
            onIrAmbiente={onIrAmbiente}
            compact
            variant="icons"
            {...accionesProps}
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
