import { useMemo } from "react";
import type { Entidad } from "@inventario/types";
import { Button } from "@inventario/ui";
import type { ActivoConUbicacion } from "../lib/activos";
import { ActivosCampoList } from "./ActivosCampoList";

interface ActivosAmbienteViewProps {
  entidad: Entidad;
  ambienteId: string;
  ambienteNombre: string;
  ambienteResponsable?: string | null;
  sedeId: string;
  activos: ActivoConUbicacion[];
  loading: boolean;
  online: boolean;
  usuarioNombre: string;
  usuarioEmail: string;
  onRegister: () => void;
  onOpenFicha: (activo: ActivoConUbicacion) => void;
  onPrintLabel: (activo: ActivoConUbicacion) => void;
  onPrintBatch?: (activos: ActivoConUbicacion[]) => void;
  onActivoUpdated: (activo: ActivoConUbicacion) => void;
}

export function ActivosAmbienteView({
  entidad,
  ambienteId,
  ambienteNombre,
  ambienteResponsable,
  sedeId,
  activos,
  loading,
  online,
  usuarioNombre,
  usuarioEmail,
  onRegister,
  onOpenFicha,
  onPrintLabel,
  onPrintBatch,
  onActivoUpdated,
}: ActivosAmbienteViewProps) {
  const activosAmbiente = useMemo(
    () => activos.filter((a) => a.ambiente_id === ambienteId),
    [activos, ambienteId],
  );

  const exportMeta = useMemo(
    () => ({
      ambienteNombre,
      responsable: ambienteResponsable,
      entidadNombre: entidad.nombre,
      usuarioNombre,
      usuarioEmail,
    }),
    [ambienteNombre, ambienteResponsable, entidad.nombre, usuarioNombre, usuarioEmail],
  );

  return (
    <ActivosCampoList
      variant="ambiente"
      entidades={[entidad]}
      entidadId={entidad.id}
      activos={activosAmbiente}
      loading={loading}
      online={online}
      fixedSedeId={sedeId}
      fixedAmbienteId={ambienteId}
      exportMeta={exportMeta}
      toolbarExtra={
        <Button type="button" size="sm" onClick={onRegister}>
          + Nuevo activo
        </Button>
      }
      onOpenFicha={onOpenFicha}
      onPrintLabel={onPrintLabel}
      onPrintBatch={onPrintBatch}
      onActivoUpdated={onActivoUpdated}
    />
  );
}
