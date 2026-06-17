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
}: RegistrarActivoPanelProps) {
  const router = useRouter();
  const isAdmin = mode === "admin";

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
        fixedSedeId={sedeId}
        fixedAmbienteId={ambienteId}
        submitLabel={isAdmin ? "Preregistrar activo" : "Registrar activo"}
        asignaCodigoInmediato={!isAdmin}
        variant="page"
        onSuccess={handleDone}
        onCancel={handleDone}
      />
    </div>
  );
}
