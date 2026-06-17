import type { ActivoConUbicacion } from "../lib/activos";
import { ActivosCampoAcciones } from "./ActivosCampoAcciones";

interface ActivosCampoAccionesCellProps {
  entidadId: string;
  activo: ActivoConUbicacion;
  online: boolean;
  onOpenFicha: (activo: ActivoConUbicacion) => void;
  onPrintLabel: (activo: ActivoConUbicacion) => void;
  onActivoUpdated: (activo: ActivoConUbicacion) => void;
}

export function ActivosCampoAccionesCell({
  entidadId,
  activo,
  online,
  onOpenFicha,
  onPrintLabel,
  onActivoUpdated,
}: ActivosCampoAccionesCellProps) {
  return (
    <td className="max-w-0 overflow-visible border-b border-r border-border/40 px-1 py-1 last:border-r-0">
      <ActivosCampoAcciones
        entidadId={entidadId}
        activo={activo}
        online={online}
        onOpenFicha={onOpenFicha}
        onPrintLabel={onPrintLabel}
        onValidated={onActivoUpdated}
        compact
      />
    </td>
  );
}
