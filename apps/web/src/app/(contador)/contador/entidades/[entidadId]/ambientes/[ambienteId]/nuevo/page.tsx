import { redirect, notFound } from "next/navigation";
import { RegistrarActivoPanel } from "@/components/panel/RegistrarActivoPanel";
import { getEntidad } from "@/lib/actions/entidades";
import { getAmbiente } from "@/lib/actions/ubicacion";
import { requireProfile } from "@/lib/auth/profile";

export default async function NuevoActivoPage({
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
  const [entidad, ambienteData] = await Promise.all([
    getEntidad(entidadId),
    getAmbiente(ambienteId),
  ]);

  if (!entidad || !ambienteData || ambienteData.entidad_id !== entidadId) {
    notFound();
  }

  const listHref = `/contador/entidades/${entidadId}/ambientes/${ambienteId}`;
  const entidadHref = `/contador/entidades/${entidadId}`;

  return (
    <RegistrarActivoPanel
      entidadId={entidadId}
      entidadNombre={entidad.nombre}
      ambienteId={ambienteId}
      ambienteNombre={ambienteData.ambiente.nombre}
      sedeId={ambienteData.ambiente.sede_id}
      listHref={listHref}
      entidadHref={entidadHref}
    />
  );
}
