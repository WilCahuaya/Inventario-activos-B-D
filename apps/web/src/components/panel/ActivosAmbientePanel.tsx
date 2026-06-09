"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Activo } from "@inventario/types";
import { Button, Dialog } from "@inventario/ui";
import { ActivoForm } from "./ActivoForm";
import { ActivosInventarioExcelView } from "./ActivosInventarioExcelView";
import { InventarioExportButtons } from "./InventarioExportButtons";
import { PanelPageHeader, panelModalClass } from "./panel-ui";

interface ActivosAmbientePanelProps {
  entidadId: string;
  entidadNombre: string;
  ambienteId: string;
  ambienteNombre: string;
  ambienteResponsable?: string | null;
  sedeId: string;
  activos: Activo[];
  /** contador: registro completo; admin: solo preregistro */
  mode?: "contador" | "admin";
}

export function ActivosAmbientePanel({
  entidadId,
  entidadNombre,
  ambienteId,
  ambienteNombre,
  ambienteResponsable,
  sedeId,
  activos,
  mode = "contador",
}: ActivosAmbientePanelProps) {
  const isAdmin = mode === "admin";
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editActivo, setEditActivo] = useState<Activo | null>(null);

  function handleSuccess() {
    setCreateOpen(false);
    setEditActivo(null);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <PanelPageHeader
        title="Inventario de activos"
        subtitle={
          ambienteResponsable
            ? `${ambienteNombre} · Responsable: ${ambienteResponsable}`
            : ambienteNombre
        }
        backHref={isAdmin ? "/admin/activos" : `/contador/entidades/${entidadId}`}
        backLabel={isAdmin ? "Ambientes" : entidadNombre}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <InventarioExportButtons
              activos={activos}
              meta={{
                ambienteNombre,
                responsable: ambienteResponsable,
                entidadNombre,
              }}
            />
            <Button type="button" onClick={() => setCreateOpen(true)}>
              {isAdmin ? "+ Preregistrar activo" : "+ Nuevo activo"}
            </Button>
          </div>
        }
      />

      {isAdmin && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-foreground">
          Los activos que usted registre quedarán como <strong>PREREGISTRADO</strong> hasta que el
          contador los valide. Mientras estén preregistrados puede editarlos con «Editar
          preregistro». Los ya registrados se mueven con «Cambiar de ambiente» en el detalle.
        </p>
      )}

      <ActivosInventarioExcelView
        activos={activos}
        onEditActivo={setEditActivo}
        puedeDarDeBaja={!isAdmin}
        puedeValidarPreregistro={false}
        modoAdmin={isAdmin}
        mostrarEstadoRegistro
        emptyActionLabel={isAdmin ? "+ Preregistrar activo" : "+ Nuevo activo"}
      />

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={isAdmin ? "Preregistrar activo" : "Registrar activo"}
        className={panelModalClass}
      >
        <ActivoForm
          entidades={[]}
          fixedEntidadId={entidadId}
          fixedSedeId={sedeId}
          fixedAmbienteId={ambienteId}
          submitLabel={isAdmin ? "Preregistrar activo" : "Registrar activo"}
          asignaCodigoInmediato={!isAdmin}
          variant="modal"
          onSuccess={handleSuccess}
        />
      </Dialog>

      <Dialog
        open={!!editActivo}
        onClose={() => setEditActivo(null)}
        title={
          editActivo && isAdmin
            ? editActivo.estado_registro === "PREREGISTRADO"
              ? "Editar preregistro"
              : "Editar ubicación"
            : "Editar activo"
        }
        className={panelModalClass}
      >
        {editActivo && (
          <ActivoForm
            entidades={[]}
            fixedEntidadId={entidadId}
            fixedSedeId={isAdmin ? undefined : sedeId}
            fixedAmbienteId={isAdmin ? undefined : ambienteId}
            activo={editActivo}
            mode="edit"
            submitLabel={
              isAdmin
                ? editActivo.estado_registro === "PREREGISTRADO"
                  ? "Guardar preregistro"
                  : "Guardar ubicación"
                : "Guardar cambios"
            }
            soloUbicacion={isAdmin && editActivo.estado_registro !== "PREREGISTRADO"}
            asignaCodigoInmediato={!isAdmin}
            variant="modal"
            onSuccess={handleSuccess}
          />
        )}
      </Dialog>
    </div>
  );
}
