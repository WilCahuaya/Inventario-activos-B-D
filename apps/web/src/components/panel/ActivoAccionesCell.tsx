"use client";

import type { Activo } from "@inventario/types";
import { ActivoAccionesBar } from "./ActivoAccionesBar";

interface ActivoAccionesCellProps {
  activo: Activo;
  onEdit: (activo: Activo) => void;
  puedeDarDeBaja?: boolean;
  puedeValidarPreregistro?: boolean;
  editarLabel?: string;
  modoAdmin?: boolean;
}

export function ActivoAccionesCell({
  activo,
  onEdit,
  puedeDarDeBaja,
  puedeValidarPreregistro,
  editarLabel,
  modoAdmin,
}: ActivoAccionesCellProps) {
  return (
    <td className="border-b border-r border-border/40 px-2 py-2 last:border-r-0">
      <ActivoAccionesBar
        activo={activo}
        onEdit={onEdit}
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
