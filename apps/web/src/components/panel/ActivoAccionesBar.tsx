"use client";

import { useMemo, useState } from "react";
import type { Activo } from "@inventario/types";
import {
  TableActionsOverflow,
  type ActivoDetalle,
  type TableActionItem,
} from "@inventario/ui/panel";
import { FotoPreviewDialog } from "./ActivoMediaDialogs";
import { ActivoDetalleModal } from "./ActivoDetalleModal";
import { ActivoIconButton, IconAmbiente, IconFoto, IconVer } from "./activo-icons";

interface ActivoAccionesBarProps {
  activo: ActivoDetalle;
  onEdit?: (activo: Activo) => void;
  onIrAmbiente?: (activo: Activo) => void;
  className?: string;
  compact?: boolean;
  variant?: "auto" | "menu" | "icons-and-menu" | "icons";
  puedeDarDeBaja?: boolean;
  puedeValidarPreregistro?: boolean;
  editarLabel?: string;
  modoAdmin?: boolean;
}

export function ActivoAccionesBar({
  activo,
  onEdit,
  onIrAmbiente,
  className,
  compact = false,
  variant = "auto",
  puedeDarDeBaja = true,
  puedeValidarPreregistro = false,
  editarLabel = "Editar activo",
  modoAdmin = false,
}: ActivoAccionesBarProps) {
  const [fotoOpen, setFotoOpen] = useState(false);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const iconSize = compact ? "h-7 w-7" : "h-9 w-9";
  const overflowVariant = compact ? (variant === "auto" ? "icons" : variant) : variant;

  const items = useMemo<TableActionItem[]>(() => {
    const list: TableActionItem[] = [];
    if (activo.foto_path) {
      list.push({
        id: "foto",
        label: "Ver foto",
        icon: <IconFoto />,
        onClick: () => setFotoOpen(true),
      });
    }
    if (onIrAmbiente && activo.ambiente_id) {
      list.push({
        id: "ambiente",
        label: "Ir al ambiente",
        icon: <IconAmbiente />,
        onClick: () => onIrAmbiente(activo),
      });
    }
    list.push({
      id: "ver",
      label: "Ver activo",
      icon: <IconVer />,
      onClick: () => setDetalleOpen(true),
    });
    return list;
  }, [activo, activo.ambiente_id, activo.foto_path, onIrAmbiente]);

  return (
    <>
      {compact ? (
        <TableActionsOverflow
          items={items}
          iconClassName={iconSize}
          variant={overflowVariant}
        />
      ) : (
        <div className={`flex flex-wrap items-center gap-1 ${className ?? ""}`}>
          {activo.foto_path && (
            <ActivoIconButton
              label="Ver foto"
              onClick={() => setFotoOpen(true)}
              className={iconSize}
            >
              <IconFoto />
            </ActivoIconButton>
          )}
          <ActivoIconButton
            label="Ver activo"
            onClick={() => setDetalleOpen(true)}
            className={iconSize}
          >
            <IconVer />
          </ActivoIconButton>
        </div>
      )}

      <ActivoDetalleModal
        activo={activo}
        open={detalleOpen}
        onClose={() => setDetalleOpen(false)}
        onEdit={onEdit}
        onIrAmbiente={onIrAmbiente}
        puedeDarDeBaja={puedeDarDeBaja}
        puedeValidarPreregistro={puedeValidarPreregistro}
        editarLabel={editarLabel}
        soloUbicacion={modoAdmin && activo.estado_registro === "REGISTRADO"}
        asignaCodigoInmediato={activo.estado_registro === "REGISTRADO"}
      />

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
