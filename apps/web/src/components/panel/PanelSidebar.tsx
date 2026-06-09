"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { PanelNavItem } from "./panel-nav-icons";
import {
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  PanelNavIcon,
} from "./panel-nav-icons";

const STORAGE_KEY = "panel-sidebar-collapsed";

interface PanelSidebarProps {
  title: string;
  links: PanelNavItem[];
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function isActive(pathname: string, href: string) {
  if (href === "/contador" || href === "/admin") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNavLink({
  href,
  label,
  icon,
  active,
  collapsed,
  onNavigate,
}: PanelNavItem & { active: boolean; collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      onClick={onNavigate}
      className={`flex items-center rounded-lg font-medium transition-colors ${
        collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5"
      } text-sm ${
        active
          ? "bg-primary/10 text-primary"
          : "text-foreground hover:bg-muted/60"
      }`}
    >
      <PanelNavIcon name={icon} />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

export function PanelSidebar({ title, links, mobileOpen, onMobileClose }: PanelSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "true") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onMobileClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, onMobileClose]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const sidebarWidth = collapsed ? "md:w-[4.5rem]" : "md:w-60";

  return (
    <>
      {/* Drawer móvil */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="presentation">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-black/50"
            onClick={onMobileClose}
          />
          <aside className="relative flex h-full w-[min(18rem,85vw)] flex-col border-r border-border/70 bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-4">
              <p className="text-sm font-semibold text-primary">{title}</p>
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={onMobileClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:bg-muted"
              >
                <IconClose />
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-3">
              {links.map((link) => (
                <SidebarNavLink
                  key={link.href}
                  {...link}
                  active={isActive(pathname, link.href)}
                  onNavigate={onMobileClose}
                />
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Sidebar tablet / desktop */}
      <aside
        className={`hidden shrink-0 flex-col border-r border-border/70 bg-card transition-[width] duration-200 md:flex ${sidebarWidth}`}
      >
        <div
          className={`flex items-center border-b border-border/50 py-4 ${
            collapsed ? "justify-center px-2" : "justify-between px-4"
          }`}
        >
          {!collapsed && (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {title}
            </p>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expandir menú lateral" : "Contraer menú lateral"}
            title={collapsed ? "Expandir menú" : "Contraer menú"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {collapsed ? <IconChevronRight className="h-4 w-4" /> : <IconChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className={`flex flex-1 flex-col gap-1 py-3 ${collapsed ? "px-2" : "px-3"}`}>
          {links.map((link) => (
            <SidebarNavLink
              key={link.href}
              {...link}
              active={isActive(pathname, link.href)}
              collapsed={collapsed}
            />
          ))}
        </nav>
      </aside>
    </>
  );
}
