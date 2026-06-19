import { useMemo, useState } from "react";
import type { ActivoConUbicacion } from "../lib/activos";
import {
  TableActionsOverflow,
  type TableActionItem,
} from "@inventario/ui/panel";
import { FotoPreviewDialog, PdfPreviewDialog } from "./ActivoMediaDialogs";
import { ActivoDetalleModal } from "./ActivoDetalleModal";
import { ActivoIconButton, IconAmbiente, IconEtiqueta, IconFoto, IconValidar, IconVer } from "./activo-icons";

interface ActivosCampoAccionesProps {
  entidadId: string;
  activo: ActivoConUbicacion;
  online: boolean;
  onEdit?: (activo: ActivoConUbicacion) => void;
  onIrAmbiente?: (activo: ActivoConUbicacion) => void;
  onPrintLabel: (activo: ActivoConUbicacion) => void;
  onPrintBatch?: (activos: ActivoConUbicacion[]) => void;
  onValidated?: (activo: ActivoConUbicacion) => void;
  compact?: boolean;
  variant?: "auto" | "menu" | "icons-and-menu" | "icons";
}

export function ActivosCampoAcciones({
  entidadId,
  activo,
  online,
  onEdit,
  onIrAmbiente,
  onPrintLabel,
  onPrintBatch,
  onValidated,
  compact,
  variant = "auto",
}: ActivosCampoAccionesProps) {
  const [fotoOpen, setFotoOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const esPreregistrado = activo.estado_registro === "PREREGISTRADO";
  const inactivo = activo.estado_registro === "DADO_DE_BAJA";
  const iconSize = compact ? "h-7 w-7" : "h-8 w-8";
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
    if (esPreregistrado && online) {
      list.push({
        id: "validar",
        label: "Validar preregistro",
        icon: <IconValidar />,
        onClick: () => setDetalleOpen(true),
      });
    }
    if (!inactivo && activo.codigo_barras) {
      list.push({
        id: "etiqueta",
        label: "Imprimir etiqueta",
        icon: <IconEtiqueta />,
        onClick: () => onPrintLabel(activo),
      });
    }
    return list;
  }, [activo, esPreregistrado, inactivo, online, onIrAmbiente, onPrintLabel]);

  return (
    <>
      {compact ? (
        <TableActionsOverflow items={items} iconClassName={iconSize} variant={overflowVariant} />
      ) : (
        <div className="flex flex-row flex-wrap items-center justify-center gap-1">
          {activo.foto_path && (
            <ActivoIconButton
              label="Ver foto"
              className={iconSize}
              onClick={() => setFotoOpen(true)}
            >
              <IconFoto />
            </ActivoIconButton>
          )}
          <ActivoIconButton
            label="Ver activo"
            className={iconSize}
            onClick={() => setDetalleOpen(true)}
          >
            <IconVer />
          </ActivoIconButton>
          {esPreregistrado && online && (
            <ActivoIconButton
              label="Validar preregistro"
              variant="primary"
              className={iconSize}
              onClick={() => setDetalleOpen(true)}
            >
              <IconValidar />
            </ActivoIconButton>
          )}
          {!inactivo && activo.codigo_barras && (
            <ActivoIconButton
              label="Imprimir etiqueta"
              className={iconSize}
              onClick={() => onPrintLabel(activo)}
            >
              <IconEtiqueta />
            </ActivoIconButton>
          )}
        </div>
      )}

      <ActivoDetalleModal
        activo={activo}
        entidadId={entidadId}
        open={detalleOpen}
        onClose={() => setDetalleOpen(false)}
        online={online}
        onEdit={onEdit}
        onIrAmbiente={onIrAmbiente}
        onActivoUpdated={onValidated}
        onPrintLabel={onPrintLabel}
        onPrintBatch={onPrintBatch}
      />

      {activo.foto_path && (
        <FotoPreviewDialog
          open={fotoOpen}
          onClose={() => setFotoOpen(false)}
          path={activo.foto_path}
          titulo={activo.nombre}
        />
      )}

      {activo.comprobante_path && (
        <PdfPreviewDialog
          open={pdfOpen}
          onClose={() => setPdfOpen(false)}
          path={activo.comprobante_path}
          titulo={activo.comprobante_serie ? `Comprobante ${activo.comprobante_serie}` : undefined}
        />
      )}
    </>
  );
}
