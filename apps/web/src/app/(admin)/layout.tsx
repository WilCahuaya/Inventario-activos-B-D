import { PanelLayout } from "@/components/panel/PanelLayout";
import { getProfile } from "@/lib/auth/profile";
import { adminNavSections, getAdminPreregistradoCount } from "@/lib/panel-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [preregistrados, profile] = await Promise.all([
    getAdminPreregistradoCount(),
    getProfile(),
  ]);

  return (
    <PanelLayout
      panelLabel="Panel entidad"
      homeHref="/admin/inventario"
      sections={adminNavSections(preregistrados)}
      user={profile ? { nombre: profile.nombre, email: profile.email } : undefined}
    >
      {children}
    </PanelLayout>
  );
}
