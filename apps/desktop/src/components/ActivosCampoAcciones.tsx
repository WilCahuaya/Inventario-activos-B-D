import { useMemo, useState } from "react";
import type { ActivoConUbicacion } from "../lib/activos";
import { TableActionsOverflow, type TableActionItem } from "@inventario/ui/panel";
import { ValidarPreregistroDialog } from "./ValidarPreregistroDialog";
import { ActivoIconButton, IconEtiqueta, IconValidar, IconVer } from "./activo-icons";
interface ActivosCampoAccionesProps {
  entidadId: string;
  activo: ActivoConUbicacion;
  online: boolean;
  onOpenFicha: (activo: ActivoConUbicacion) => void;
  onPrintLabel: (activo: ActivoConUbicacion) => void;
  onValidated?: (activo: ActivoConUbicacion) => void;
  compact?: boolean;
}

export function ActivosCampoAcciones({
  entidadId,
  activo,
  online,
  onOpenFicha,
  onPrintLabel,
  onValidated,
  compact,
}: ActivosCampoAccionesProps) {
  const [validarOpen, setValidarOpen] = useState(false);
  const esPreregistrado = activo.estado_registro === "PREREGISTRADO";
  const inactivo = activo.estado_registro === "DADO_DE_BAJA";
  const iconSize = compact ? "h-7 w-7" : "h-8 w-8";

  const items = useMemo<TableActionItem[]>(() => {
    const list: TableActionItem[] = [];
    if (esPreregistrado) {
      list.push({
        id: "validar",
        label: online ? "Validar preregistro" : "Validar preregistro (requiere conexión)",
        icon: <IconValidar />,
        onClick: () => setValidarOpen(true),
        disabled: !online,
      });
    }
    list.push({
      id: "ficha",
      label: "Ver ficha del activo",
      icon: <IconVer />,
      onClick: () => onOpenFicha(activo),
    });
    if (!inactivo) {
      list.push({
        id: "etiqueta",
        label: activo.codigo_barras ? "Imprimir etiqueta" : "Sin código de barras asignado",
        icon: <IconEtiqueta />,
        onClick: () => onPrintLabel(activo),
        disabled: !activo.codigo_barras,
      });
    }
    return list;
  }, [activo, esPreregistrado, inactivo, online, onOpenFicha, onPrintLabel]);

  return (
    <>
      {compact ? (
        <TableActionsOverflow items={items} iconClassName={iconSize} variant="menu" />
      ) : (
        <div className="flex flex-row flex-wrap items-center justify-center gap-1">
          {esPreregistrado && (
            <ActivoIconButton
              label={online ? "Validar preregistro" : "Validar preregistro (requiere conexión)"}
              variant="primary"
              disabled={!online}
              className={iconSize}
              onClick={() => setValidarOpen(true)}
            >
              <IconValidar />
            </ActivoIconButton>
          )}
          <ActivoIconButton
            label="Ver ficha del activo"
            className={iconSize}
            onClick={() => onOpenFicha(activo)}
          >
            <IconVer />
          </ActivoIconButton>
          {!inactivo && (
            <ActivoIconButton
              label={activo.codigo_barras ? "Imprimir etiqueta" : "Sin código de barras asignado"}
              className={iconSize}
              disabled={!activo.codigo_barras}
              onClick={() => onPrintLabel(activo)}
            >
              <IconEtiqueta />
            </ActivoIconButton>
          )}
        </div>
      )}
      {esPreregistrado && (
        <ValidarPreregistroDialog
          open={validarOpen}
          onClose={() => setValidarOpen(false)}
          entidadId={entidadId}
          activoId={activo.id}
          nombre={activo.nombre}
          codigoCatalogo={activo.codigo_catalogo}
          onSuccess={onValidated}
        />
      )}
    </>
  );
}
