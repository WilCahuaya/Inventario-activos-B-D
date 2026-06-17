import { redirect, notFound } from "next/navigation";
import { AmbientesPanel } from "@/components/panel/AmbientesPanel";
import { getEntidad } from "@/lib/actions/entidades";
import { listAmbientesPorEntidad, listSedesConConteo } from "@/lib/actions/ubicacion";
import { listResponsables } from "@/lib/actions/responsables";
import { requireProfile } from "@/lib/auth/profile";

export default async function EntidadAmbientesPage({
  params,
  searchParams,
}: {
  params: Promise<{ entidadId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  try {
    await requireProfile("CONTADOR");
  } catch {
    redirect("/login");
  }

  const { entidadId } = await params;
  const { tab } = await searchParams;
  const entidad = await getEntidad(entidadId);
  if (!entidad) notFound();

  const [ambientes, sedes, responsables] = await Promise.all([
    listAmbientesPorEntidad(entidadId),
    listSedesConConteo(entidadId),
    listResponsables(entidadId),
  ]);

  return (
    <AmbientesPanel
      entidad={entidad}
      ambientes={ambientes}
      sedes={sedes}
      responsables={responsables}
      initialTab={tab === "responsables" ? "responsables" : undefined}
    />
  );
}
