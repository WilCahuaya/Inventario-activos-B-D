import type { ReactNode } from "react";
import { APP_CLIENT, APP_NAME } from "@inventario/types";
import { Button } from "@inventario/ui";
import { ThemeToggle } from "@inventario/ui/theme-toggle";
import { signOut } from "../hooks/useAuth";
import { ConnectionBadge } from "./ConnectionBadge";

export type MainNav = "entidades" | "inventario" | "usuarios";

export interface AppSubheader {
  title: string;
  subtitle?: string;
  onBack: () => void;
  backLabel?: string;
}

const NAV_ITEMS: { id: MainNav; label: string }[] = [
  { id: "entidades", label: "Entidades" },
  { id: "inventario", label: "Inventario" },
  { id: "usuarios", label: "Usuarios" },
];

interface AppShellProps {
  activeNav: MainNav;
  onNavChange: (nav: MainNav) => void;
  subheader?: AppSubheader;
  online: boolean;
  pendingSync?: number;
  syncing?: boolean;
  userEmail: string;
  children: ReactNode;
}

export function AppShell({
  activeNav,
  onNavChange,
  subheader,
  online,
  pendingSync = 0,
  syncing = false,
  userEmail,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="shrink-0 border-b border-border/70 bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3">
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-primary sm:text-lg">{APP_NAME}</p>
            <p className="truncate text-xs text-muted-foreground">
              Panel de campo — {APP_CLIENT}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ConnectionBadge online={online} pending={pendingSync} syncing={syncing} />
            <span className="hidden text-xs text-muted-foreground sm:inline">{userEmail}</span>
            <ThemeToggle />
            <Button type="button" variant="outline" size="sm" onClick={() => void signOut()}>
              Salir
            </Button>
          </div>
        </div>

        <nav
          className="flex gap-1 overflow-x-auto border-t border-border/50 px-3 sm:px-6"
          aria-label="Secciones principales"
        >
          {NAV_ITEMS.map((item) => {
            const active = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavChange(item.id)}
                className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      {subheader && (
        <div className="shrink-0 border-b border-border/60 bg-card/80 px-3 py-2 sm:px-4">
          <button
            type="button"
            onClick={subheader.onBack}
            className="text-sm font-medium text-primary hover:underline"
          >
            ← {subheader.backLabel ?? "Volver"}
          </button>
          <div className="mt-2">
            <h1 className="text-lg font-semibold text-foreground">{subheader.title}</h1>
            {subheader.subtitle && (
              <p className="truncate text-sm text-muted-foreground">{subheader.subtitle}</p>
            )}
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-[1600px] flex-1 p-2 sm:p-3">{children}</main>
    </div>
  );
}
