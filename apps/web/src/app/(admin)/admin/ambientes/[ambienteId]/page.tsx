import { redirect, notFound } from "next/navigation";
import { ActivosAmbientePanel } from "@/components/panel/ActivosAmbientePanel";
import { listActivosPorAmbiente } from "@/lib/actions/activos";
import { getEntidad } from "@/lib/actions/entidades";
import { getAmbiente } from "@/lib/actions/ubicacion";
import { getProfile } from "@/lib/auth/profile";

export default async function AdminAmbienteInventarioPage({
  params,
}: {
  params: Promise<{ ambienteId: string }>;
}) {
  const profile = await getProfile();
  if (!profile || profile.rol !== "ADMIN_ENTIDAD" || !profile.entidad_id) {
    redirect("/login");
  }

  const { ambienteId } = await params;
  const [entidad, ambienteData, activos] = await Promise.all([
    getEntidad(profile.entidad_id),
    getAmbiente(ambienteId),
    listActivosPorAmbiente(ambienteId),
  ]);

  if (!entidad || !ambienteData || ambienteData.entidad_id !== profile.entidad_id) {
    notFound();
  }

  return (
    <ActivosAmbientePanel
      mode="admin"
      entidadId={profile.entidad_id}
      entidadNombre={entidad.nombre}
      ambienteId={ambienteId}
      ambienteNombre={ambienteData.ambiente.nombre}
      ambienteResponsable={ambienteData.ambiente.responsable}
      sedeId={ambienteData.ambiente.sede_id}
      activos={activos}
    />
  );
}
