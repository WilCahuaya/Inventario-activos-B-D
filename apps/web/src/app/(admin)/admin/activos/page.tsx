import { redirect } from "next/navigation";
import { AdminAmbientesPanel } from "@/components/panel/AdminAmbientesPanel";
import { getProfile } from "@/lib/auth/profile";
import { getEntidad } from "@/lib/actions/entidades";
import { listActivos } from "@/lib/actions/activos";
import { listAmbientesPorEntidad, listSedesConConteo } from "@/lib/actions/ubicacion";

export default async function AdminAmbientesPage() {
  const profile = await getProfile();
  if (!profile || profile.rol !== "ADMIN_ENTIDAD" || !profile.entidad_id) {
    redirect("/login");
  }

  const entidadId = profile.entidad_id;
  const [entidad, ambientes, sedes, activos] = await Promise.all([
    getEntidad(entidadId),
    listAmbientesPorEntidad(entidadId),
    listSedesConConteo(entidadId),
    listActivos(),
  ]);

  if (!entidad) redirect("/login");

  const activosPorAmbiente: Record<string, number> = {};
  for (const activo of activos) {
    if (activo.ambiente_id) {
      activosPorAmbiente[activo.ambiente_id] =
        (activosPorAmbiente[activo.ambiente_id] ?? 0) + 1;
    }
  }

  return (
    <AdminAmbientesPanel
      entidad={entidad}
      ambientes={ambientes}
      sedes={sedes}
      activosPorAmbiente={activosPorAmbiente}
    />
  );
}
