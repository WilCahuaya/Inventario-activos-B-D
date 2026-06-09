import { useMemo } from "react";
import type { Entidad } from "@inventario/types";
import { Button } from "@inventario/ui";
import { PanelBanner } from "@inventario/ui/panel";
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

  const registradosCount = activosAmbiente.filter((a) => a.estado_registro === "REGISTRADO").length;
  const preregistradosCount = activosAmbiente.filter(
    (a) => a.estado_registro === "PREREGISTRADO",
  ).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PanelBanner
          label="Inventario de activos"
          title={ambienteNombre}
          subtitle={
            ambienteResponsable
              ? `${entidad.nombre} · Responsable: ${ambienteResponsable}`
              : entidad.nombre
          }
        />
        <Button type="button" onClick={onRegister}>
          + Nuevo activo
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-md border border-border/60 bg-card px-2 py-1">
          <span className="text-muted-foreground">Registrados </span>
          <span className="font-semibold text-primary">{registradosCount}</span>
        </span>
        <span className="rounded-md border border-border/60 bg-card px-2 py-1">
          <span className="text-muted-foreground">Preregistrados </span>
          <span className="font-semibold text-primary">{preregistradosCount}</span>
        </span>
        <span className="rounded-md border border-border/60 bg-card px-2 py-1">
          <span className="text-muted-foreground">Total </span>
          <span className="font-semibold text-primary">{activosAmbiente.length}</span>
        </span>
      </div>

      <ActivosCampoList
        variant="ambiente"
        entidades={[entidad]}
        entidadId={entidad.id}
        activos={activosAmbiente}
        loading={loading}
        online={online}
        fixedSedeId={sedeId}
        fixedAmbienteId={ambienteId}
        onOpenFicha={onOpenFicha}
        onPrintLabel={onPrintLabel}
        onPrintBatch={onPrintBatch}
        onActivoUpdated={onActivoUpdated}
      />
    </div>
  );
}
