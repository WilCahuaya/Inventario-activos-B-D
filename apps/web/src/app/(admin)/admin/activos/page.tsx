import { redirect } from "next/navigation";
import { AdminAmbientesPanel } from "@/components/panel/AdminAmbientesPanel";
import { getProfile } from "@/lib/auth/profile";
import { getEntidad } from "@/lib/actions/entidades";
import { listResponsables } from "@/lib/actions/responsables";
import { listAmbientesPorEntidad, listSedesConConteo } from "@/lib/actions/ubicacion";

export default async function AdminAmbientesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const profile = await getProfile();
  if (!profile || profile.rol !== "ADMIN_ENTIDAD" || !profile.entidad_id) {
    redirect("/login");
  }

  const entidadId = profile.entidad_id;
  const { tab } = await searchParams;
  const [entidad, ambientes, sedes, responsables] = await Promise.all([
    getEntidad(entidadId),
    listAmbientesPorEntidad(entidadId),
    listSedesConConteo(entidadId),
    listResponsables(entidadId),
  ]);

  if (!entidad) redirect("/login");

  return (
    <AdminAmbientesPanel
      entidad={entidad}
      ambientes={ambientes}
      sedes={sedes}
      responsables={responsables}
      initialTab={tab === "responsables" ? "responsables" : undefined}
    />
  );
}
