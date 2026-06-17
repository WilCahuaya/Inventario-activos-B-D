"use client";

import { useMemo, useState } from "react";
import type { Activo } from "@inventario/types";
import { TableActionsOverflow, type TableActionItem } from "@inventario/ui/panel";
import { FotoPreviewDialog } from "./ActivoMediaDialogs";
import { ActivoIconButton, IconFoto, IconVer } from "./activo-icons";

interface ActivoAccionesBarProps {
  activo: Activo;
  onEdit: (activo: Activo) => void;
  onOpenFicha: (activo: Activo) => void;
  className?: string;
  compact?: boolean;
  puedeDarDeBaja?: boolean;
  puedeValidarPreregistro?: boolean;
  editarLabel?: string;
  /** Etiqueta según estado: preregistro vs ubicación */
  modoAdmin?: boolean;
}

export function ActivoAccionesBar({
  activo,
  onOpenFicha,
  className,
  compact = false,
}: ActivoAccionesBarProps) {
  const [fotoOpen, setFotoOpen] = useState(false);
  const iconSize = compact ? "h-7 w-7" : "h-9 w-9";

  const items = useMemo<TableActionItem[]>(
    () => [
      {
        id: "foto",
        label: "Ver foto",
        icon: <IconFoto />,
        onClick: () => setFotoOpen(true),
        disabled: !activo.foto_path,
      },
      {
        id: "ver",
        label: "Ver activo",
        icon: <IconVer />,
        onClick: () => onOpenFicha(activo),
      },
    ],
    [activo, onOpenFicha],
  );

  return (
    <>
      {compact ? (
        <TableActionsOverflow items={items} iconClassName={iconSize} variant="menu" />
      ) : (
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
            onClick={() => onOpenFicha(activo)}
            className={iconSize}
          >
            <IconVer />
          </ActivoIconButton>
        </div>
      )}

      {activo.foto_path && (
        <FotoPreviewDialog
          open={fotoOpen}
          onClose={() => setFotoOpen(false)}
          path={activo.foto_path}
          titulo={activo.nombre}
        />
      )}
    </>
  );
}
