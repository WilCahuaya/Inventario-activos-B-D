import { redirect, notFound } from "next/navigation";
import { AmbientesPanel } from "@/components/panel/AmbientesPanel";
import { getEntidad } from "@/lib/actions/entidades";
import { listAmbientesPorEntidad, listSedesConConteo } from "@/lib/actions/ubicacion";
import { requireProfile } from "@/lib/auth/profile";

export default async function EntidadAmbientesPage({
  params,
}: {
  params: Promise<{ entidadId: string }>;
}) {
  try {
    await requireProfile("CONTADOR");
  } catch {
    redirect("/login");
  }

  const { entidadId } = await params;
  const entidad = await getEntidad(entidadId);
  if (!entidad) notFound();

  const [ambientes, sedes] = await Promise.all([
    listAmbientesPorEntidad(entidadId),
    listSedesConConteo(entidadId),
  ]);

  return <AmbientesPanel entidad={entidad} ambientes={ambientes} sedes={sedes} />;
}
