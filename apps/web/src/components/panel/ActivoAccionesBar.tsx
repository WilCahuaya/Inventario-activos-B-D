"use client";

import { useState } from "react";
import type { Activo } from "@inventario/types";
import { ActivoDetalleModal } from "./ActivoDetalleModal";
import { FotoPreviewDialog } from "./ActivoMediaDialogs";
import { ActivoIconButton, IconFoto, IconVer } from "./activo-icons";

interface ActivoAccionesBarProps {
  activo: Activo;
  onEdit: (activo: Activo) => void;
  className?: string;
  compact?: boolean;
  puedeDarDeBaja?: boolean;
  puedeValidarPreregistro?: boolean;
  editarLabel?: string;
  /** Etiqueta según estado: preregistro vs ubicación */
  modoAdmin?: boolean;
}

function labelEditarAdmin(activo: Activo) {
  return activo.estado_registro === "PREREGISTRADO" ? "Editar preregistro" : "Editar ubicación";
}

export function ActivoAccionesBar({
  activo,
  onEdit,
  className,
  compact = false,
  puedeDarDeBaja = true,
  puedeValidarPreregistro = false,
  editarLabel,
  modoAdmin = false,
}: ActivoAccionesBarProps) {
  const labelEditar = editarLabel ?? (modoAdmin ? labelEditarAdmin(activo) : "Editar activo");
  const puedeEditar =
    modoAdmin && activo.estado_registro === "REGISTRADO" ? undefined : onEdit;
  const [fotoOpen, setFotoOpen] = useState(false);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const iconSize = compact ? "h-7 w-7" : "h-9 w-9";

  return (
    <>
      <div className={`flex flex-wrap items-center gap-1 ${className ?? ""}`}>
        <ActivoIconButton
          label="Ver foto"
          disabled={!activo.foto_path}
          onClick={() => setFotoOpen(true)}
          className={iconSize}
        >
          <IconFoto />
        </ActivoIconButton>
        <ActivoIconButton
          label="Ver activo"
          onClick={() => setDetalleOpen(true)}
          className={iconSize}
        >
          <IconVer />
        </ActivoIconButton>
      </div>

      {activo.foto_path && (
        <FotoPreviewDialog
          open={fotoOpen}
          onClose={() => setFotoOpen(false)}
          path={activo.foto_path}
          titulo={activo.nombre}
        />
      )}

      <ActivoDetalleModal
        open={detalleOpen}
        onClose={() => setDetalleOpen(false)}
        activo={activo}
        onEdit={puedeEditar}
        puedeDarDeBaja={puedeDarDeBaja}
        puedeValidarPreregistro={puedeValidarPreregistro}
        editarLabel={labelEditar}
      />
    </>
  );
}
