import { PanelLayout } from "@/components/panel/PanelLayout";
import type { PanelNavItem } from "@/components/panel/panel-nav-icons";

const ADMIN_LINKS: PanelNavItem[] = [
  { href: "/admin", label: "Mi inventario", icon: "dashboard" },
  { href: "/admin/activos", label: "Ambientes", icon: "inventory" },
  { href: "/admin/reportes", label: "Reportes", icon: "reports" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PanelLayout
      panelLabel="Panel entidad"
      homeHref="/admin"
      sidebarTitle="Administrador"
      links={ADMIN_LINKS}
    >
      {children}
    </PanelLayout>
  );
}
