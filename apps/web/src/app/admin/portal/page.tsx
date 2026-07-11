import { redirect } from "next/navigation";
import { EntityPortalView } from "@/components/portal/EntityPortalView";
import { getEntidad } from "@/lib/actions/entidades";
import { requireProfile } from "@/lib/auth/profile";

export default async function AdminPortalPage() {
  try {
    const profile = await requireProfile("ADMIN_ENTIDAD");
    if (!profile.entidad_id) redirect("/login?error=no_profile");

    const entidad = await getEntidad(profile.entidad_id);
    if (!entidad) redirect("/login?error=no_profile");

    return (
      <EntityPortalView
        entidad={entidad}
        gestionHref="/admin/inventario"
      />
    );
  } catch {
    redirect("/login");
  }
}
