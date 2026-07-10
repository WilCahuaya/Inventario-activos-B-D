import { useEffect, useMemo, useState } from "react";
import type { Entidad } from "@inventario/types";
import { Button } from "@inventario/ui";
import type { ActivoConUbicacion } from "../lib/activos";
import type { AmbienteDestinoNavigation } from "./AgregarBienesSimilaresDialog";
import {
  resolveFichaAsignacionExportMeta,
  type FichaAsignacionExportMeta,
} from "../lib/ficha-asignacion-meta";
import { ActivosCampoList } from "./ActivosCampoList";
import { AmbienteReportesExport } from "./AmbienteReportesExport";

interface ActivosAmbienteViewProps {
  entidad: Entidad;
  ambienteId: string;
  ambienteNombre: string;
  ambienteResponsable?: string | null;
  ambienteResponsableId?: string | null;
  sedeId: string;
  sedeNombre?: string | null;
  esAmbientePreregistro?: boolean;
  activos: ActivoConUbicacion[];
  loading: boolean;
  online: boolean;
  usuarioNombre: string;
  usuarioEmail: string;
  onRegister: () => void;
  onPrintLabel: (activo: ActivoConUbicacion) => void;
  onPrintBatch?: (activos: ActivoConUbicacion[]) => void;
  onEditActivo?: (activo: ActivoConUbicacion) => void;
  onActivoUpdated: (activo: ActivoConUbicacion) => void;
  onActivoDeleted?: () => void;
  onAbrirAmbienteDestino?: (destino: AmbienteDestinoNavigation) => void;
}

export function ActivosAmbienteView({
  entidad,
  ambienteId,
  ambienteNombre,
  ambienteResponsable,
  ambienteResponsableId,
  sedeId,
  sedeNombre,
  esAmbientePreregistro = false,
  activos,
  loading,
  online,
  usuarioNombre,
  usuarioEmail,
  onRegister,
  onPrintLabel,
  onPrintBatch,
  onEditActivo,
  onActivoUpdated,
  onActivoDeleted,
  onAbrirAmbienteDestino,
}: ActivosAmbienteViewProps) {
  const activosAmbiente = useMemo(
    () => activos.filter((a) => a.ambiente_id === ambienteId),
    [activos, ambienteId],
  );

  const [fichaMeta, setFichaMeta] = useState<FichaAsignacionExportMeta | null>(null);

  useEffect(() => {
    if (!online) {
      setFichaMeta(null);
      return;
    }
    let cancelled = false;
    void resolveFichaAsignacionExportMeta(
      entidad,
      {
        responsable_id: ambienteResponsableId ?? null,
        responsable: ambienteResponsable ?? null,
      },
      sedeNombre,
    )
      .then((meta) => {
        if (!cancelled) setFichaMeta(meta);
      })
      .catch(() => {
        if (!cancelled) setFichaMeta(null);
      });
    return () => {
      cancelled = true;
    };
  }, [entidad, ambienteResponsableId, ambienteResponsable, sedeNombre, online]);

  const exportMeta = useMemo(
    () => ({
      ambienteNombre,
      entidadNombre: entidad.nombre,
      sedeNombre: fichaMeta?.sedeNombre ?? sedeNombre,
      responsable: fichaMeta?.responsable ?? ambienteResponsable,
      responsableDni: fichaMeta?.responsableDni,
      adminNombre: fichaMeta?.adminNombre ?? entidad.admin_nombre,
      adminDni: fichaMeta?.adminDni,
      usuarioNombre,
      usuarioEmail,
    }),
    [
      ambienteNombre,
      ambienteResponsable,
      entidad,
      fichaMeta,
      sedeNombre,
      usuarioNombre,
      usuarioEmail,
    ],
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
      esAmbientePreregistro={esAmbientePreregistro}
      exportMeta={exportMeta}
      reportesExport={
        !esAmbientePreregistro ? (
          <AmbienteReportesExport
            entidadId={entidad.id}
            entidadNombre={entidad.nombre}
            sedeId={sedeId}
            ambienteId={ambienteId}
            ambienteNombre={ambienteNombre}
            ambienteResponsable={ambienteResponsable}
            fichaExportMeta={fichaMeta}
            usuarioNombre={usuarioNombre}
            usuarioEmail={usuarioEmail}
            online={online}
          />
        ) : undefined
      }
      toolbarExtra={
        <Button type="button" size="sm" onClick={onRegister}>
          {esAmbientePreregistro ? "+ Preregistrar activo" : "+ Nuevo activo"}
        </Button>
      }
      onPrintLabel={onPrintLabel}
      onPrintBatch={onPrintBatch}
      onEditActivo={onEditActivo}
      onActivoUpdated={onActivoUpdated}
      onActivoDeleted={onActivoDeleted}
      onAbrirAmbienteDestino={onAbrirAmbienteDestino}
    />
  );
}
