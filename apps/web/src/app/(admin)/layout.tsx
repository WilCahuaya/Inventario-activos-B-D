import { PanelLayout } from "@/components/panel/PanelLayout";
import { getProfile } from "@/lib/auth/profile";
import { getAmbientePreregistro } from "@/lib/actions/ubicacion";
import { adminNavSections, getAdminPreregistradoCount } from "@/lib/panel-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [preregistrados, profile] = await Promise.all([
    getAdminPreregistradoCount(),
    getProfile(),
  ]);

  const preregistroAmbiente =
    profile?.entidad_id != null
      ? await getAmbientePreregistro(profile.entidad_id)
      : null;

  return (
    <PanelLayout
      panelLabel="Panel entidad"
      homeHref="/admin/inventario"
      sections={adminNavSections(
        preregistrados,
        preregistroAmbiente ? `/admin/ambientes/${preregistroAmbiente.id}` : undefined,
      )}
      user={profile ? { nombre: profile.nombre, email: profile.email } : undefined}
      realtimeEntidadId={profile?.entidad_id ?? null}
    >
      {children}
    </PanelLayout>
  );
}
