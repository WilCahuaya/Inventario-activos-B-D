import Link from "next/link";
import { APP_CLIENT, APP_NAME } from "@inventario/types";
import { PanelSidebar } from "@/components/panel/PanelSidebar";
import { LogoutButton } from "@/components/shared/LogoutButton";

const CONTADOR_LINKS = [
  { href: "/contador", label: "Dashboard" },
  { href: "/contador/entidades", label: "Entidades" },
  { href: "/contador/inventario", label: "Inventario" },
];

export default function ContadorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card">
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <Link href="/contador">
              <p className="text-lg font-semibold text-primary">{APP_NAME}</p>
              <p className="text-xs text-muted-foreground">
                Panel contador — {APP_CLIENT}
              </p>
            </Link>
          </div>
          <LogoutButton />
        </div>
      </header>
      <div className="flex flex-1">
        <PanelSidebar title="Contador" links={CONTADOR_LINKS} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
