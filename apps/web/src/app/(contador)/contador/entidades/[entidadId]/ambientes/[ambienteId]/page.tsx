import { redirect, notFound } from "next/navigation";
import { ActivosAmbientePanel } from "@/components/panel/ActivosAmbientePanel";
import { listActivosPorAmbiente } from "@/lib/actions/activos";
import { getEntidad } from "@/lib/actions/entidades";
import { getAmbiente } from "@/lib/actions/ubicacion";
import { requireProfile } from "@/lib/auth/profile";

export default async function AmbienteActivosPage({
  params,
}: {
  params: Promise<{ entidadId: string; ambienteId: string }>;
}) {
  try {
    await requireProfile("CONTADOR");
  } catch {
    redirect("/login");
  }

  const { entidadId, ambienteId } = await params;
  const [entidad, ambienteData, activos] = await Promise.all([
    getEntidad(entidadId),
    getAmbiente(ambienteId),
    listActivosPorAmbiente(ambienteId),
  ]);

  if (!entidad || !ambienteData || ambienteData.entidad_id !== entidadId) {
    notFound();
  }

  return (
    <ActivosAmbientePanel
      entidadId={entidadId}
      entidadNombre={entidad.nombre}
      ambienteId={ambienteId}
      ambienteNombre={ambienteData.ambiente.nombre}
      ambienteResponsable={ambienteData.ambiente.responsable}
      sedeId={ambienteData.ambiente.sede_id}
      activos={activos}
    />
  );
}
