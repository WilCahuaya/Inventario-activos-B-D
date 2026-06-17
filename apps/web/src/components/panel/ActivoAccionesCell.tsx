"use client";

import type { Activo } from "@inventario/types";
import { ActivoAccionesBar } from "./ActivoAccionesBar";

interface ActivoAccionesCellProps {
  activo: Activo;
  onEdit: (activo: Activo) => void;
  onOpenFicha: (activo: Activo) => void;
  puedeDarDeBaja?: boolean;
  puedeValidarPreregistro?: boolean;
  editarLabel?: string;
  modoAdmin?: boolean;
}

export function ActivoAccionesCell({
  activo,
  onEdit,
  onOpenFicha,
  puedeDarDeBaja,
  puedeValidarPreregistro,
  editarLabel,
  modoAdmin,
}: ActivoAccionesCellProps) {
  return (
    <td className="max-w-0 overflow-visible border-b border-r border-border/40 px-1 py-1 last:border-r-0">
      <ActivoAccionesBar
        activo={activo}
        onEdit={onEdit}
        onOpenFicha={onOpenFicha}
        compact
        className="justify-center"
        puedeDarDeBaja={puedeDarDeBaja}
        puedeValidarPreregistro={puedeValidarPreregistro}
        editarLabel={editarLabel}
        modoAdmin={modoAdmin}
      />
    </td>
  );
}
