"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { APP_CLIENT, APP_NAME } from "@inventario/types";
import { LogoutButton } from "@/components/shared/LogoutButton";
import type { PanelNavItem } from "./panel-nav-icons";
import { IconMenu } from "./panel-nav-icons";
import { PanelSidebar } from "./PanelSidebar";

interface PanelLayoutProps {
  panelLabel: string;
  homeHref: string;
  sidebarTitle: string;
  links: PanelNavItem[];
  children: ReactNode;
}

export function PanelLayout({
  panelLabel,
  homeHref,
  sidebarTitle,
  links,
  children,
}: PanelLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b border-border/70 bg-card shadow-sm">
        <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Abrir menú de navegación"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border/60 text-foreground hover:bg-muted md:hidden"
            >
              <IconMenu />
            </button>
            <Link href={homeHref} className="group min-w-0">
              <p className="truncate text-base font-bold text-primary group-hover:opacity-90 sm:text-lg">
                {APP_NAME}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {panelLabel} — {APP_CLIENT}
              </p>
            </Link>
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <PanelSidebar
          title={sidebarTitle}
          links={links}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <main className="min-w-0 flex-1 p-3 sm:p-4 md:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
