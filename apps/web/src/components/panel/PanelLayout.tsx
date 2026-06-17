"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { APP_CLIENT, APP_NAME } from "@inventario/types";
import { ThemeToggle } from "@inventario/ui/theme-toggle";
import type { PanelNavSection } from "./panel-nav-icons";
import { IconMenu } from "./panel-nav-icons";
import { PanelSidebar } from "./PanelSidebar";

interface PanelLayoutProps {
  panelLabel: string;
  homeHref: string;
  sections: PanelNavSection[];
  user?: { nombre: string; email: string };
  children: ReactNode;
}

export function PanelLayout({
  panelLabel,
  homeHref,
  sections,
  user,
  children,
}: PanelLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="panel-shell flex h-dvh w-full max-w-full flex-col overflow-hidden bg-muted/30">
      <header className="border-b border-border/70 bg-card shadow-sm">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-5 sm:py-3">
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
          <ThemeToggle />
        </div>
      </header>

      <div className="flex min-h-0 w-full max-w-full flex-1 overflow-hidden md:flex-row">
        <PanelSidebar
          sections={sections}
          user={user}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <main className="panel-main-scroll min-w-0 flex-1 px-3 pb-3 pt-1.5 sm:px-4 sm:pb-4 md:px-5 lg:px-6">
          <div className="mx-auto min-w-0 w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
