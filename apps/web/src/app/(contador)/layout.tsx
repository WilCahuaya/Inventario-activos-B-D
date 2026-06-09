import { PanelLayout } from "@/components/panel/PanelLayout";
import type { PanelNavItem } from "@/components/panel/panel-nav-icons";

const CONTADOR_LINKS: PanelNavItem[] = [
  { href: "/contador", label: "Dashboard", icon: "dashboard" },
  { href: "/contador/entidades", label: "Entidades", icon: "entities" },
  { href: "/contador/inventario", label: "Inventario", icon: "inventory" },
  { href: "/contador/usuarios", label: "Usuarios", icon: "users" },
  { href: "/contador/reportes", label: "Reportes", icon: "reports" },
];

export default function ContadorLayout({ children }: { children: React.ReactNode }) {
  return (
    <PanelLayout
      panelLabel="Panel contador"
      homeHref="/contador"
      sidebarTitle="Contador"
      links={CONTADOR_LINKS}
    >
      {children}
    </PanelLayout>
  );
}
