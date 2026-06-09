"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  panelCardClass,
} from "@inventario/ui/panel";

export {
  PanelBanner,
  PanelCountLabel,
  PanelEmptyState,
  PanelSearchInput,
  PanelToolbar,
  SearchIcon,
  StatusBadge,
  panelCardClass,
  panelFieldsetClass,
  panelLegendClass,
  panelModalClass,
} from "@inventario/ui/panel";

export function EditIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
      />
    </svg>
  );
}

export function PanelBackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm font-medium text-primary hover:underline">
      ← {children}
    </Link>
  );
}

export function PanelPageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  actions,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <div>
      {backHref && backLabel && (
        <PanelBackLink href={backHref}>{backLabel}</PanelBackLink>
      )}
      <div
        className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4 ${backHref ? "mt-3" : ""}`}
      >
        <div>
          <h1 className="text-xl font-bold text-primary sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && (
          <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export function PanelStatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number | string;
  href?: string;
}) {
  const content = (
    <div className={`${panelCardClass} p-5 transition-colors ${href ? "hover:border-primary/40" : ""}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold text-primary">{value}</p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }
  return content;
}
