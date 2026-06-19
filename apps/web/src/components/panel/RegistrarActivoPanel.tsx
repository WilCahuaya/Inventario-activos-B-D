"use client";

import { useRouter } from "next/navigation";
import { ActivoForm } from "./ActivoForm";
import { PanelPageHeader } from "./panel-ui";

interface RegistrarActivoPanelProps {
  entidadId: string;
  entidadNombre: string;
  ambienteId: string;
  ambienteNombre: string;
  sedeId: string;
  listHref: string;
  entidadHref: string;
  mode?: "contador" | "admin";
  esAmbientePreregistro?: boolean;
  /** Admin: sugerir posible ambiente al preregistrar desde un ambiente real */
  posibleAmbientePreset?: { sedeId: string; ambienteId: string };
}

export function RegistrarActivoPanel({
  entidadId,
  entidadNombre,
  ambienteId,
  ambienteNombre,
  sedeId,
  listHref,
  entidadHref,
  mode = "contador",
  esAmbientePreregistro = false,
  posibleAmbientePreset,
}: RegistrarActivoPanelProps) {
  const router = useRouter();
  const isAdmin = mode === "admin";
  const esPreregistro = isAdmin || esAmbientePreregistro;

  function handleDone() {
    router.push(listHref);
    router.refresh();
  }

  const breadcrumbs = isAdmin
    ? [
        { label: "Ambientes", href: entidadHref },
        { label: ambienteNombre, href: listHref },
        { label: "Preregistrar activo" },
      ]
    : esPreregistro
      ? [
          { label: entidadNombre, href: entidadHref },
          { label: ambienteNombre, href: listHref },
          { label: "Preregistrar activo" },
        ]
      : [
          { label: entidadNombre, href: entidadHref },
          { label: ambienteNombre, href: listHref },
          { label: "Crear activo" },
        ];

  return (
    <div className="space-y-5">
      <PanelPageHeader breadcrumbs={breadcrumbs} />

      <ActivoForm
        entidades={[]}
        fixedEntidadId={entidadId}
        fixedSedeId={esPreregistro ? undefined : sedeId}
        fixedAmbienteId={esPreregistro ? undefined : ambienteId}
        submitLabel={esPreregistro ? "Preregistrar activo" : "Registrar activo"}
        asignaCodigoInmediato={!esPreregistro}
        posibleAmbientePreset={isAdmin && !esAmbientePreregistro ? posibleAmbientePreset : undefined}
        variant="page"
        onSuccess={handleDone}
        onCancel={handleDone}
      />
    </div>
  );
}
