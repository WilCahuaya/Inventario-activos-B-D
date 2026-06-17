"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./components";
import { EditIcon } from "./panel";
import { IconAssets, IconEntities, IconUsers } from "./panel-nav-icons";

export function DeleteIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
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
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0h8l-.8-2.4A1 1 0 0014.2 4H9.8a1 1 0 00-.96.7L8 7z"
      />
    </svg>
  );
}

export function ViewIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
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
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

export function ActivateIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function AmbientesIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return <IconEntities className={className} />;
}

export function ActivosIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return <IconAssets className={className} />;
}

export function ResponsablesIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return <IconUsers className={className} />;
}

const iconBtnClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40";

export function PanelIconAction({
  label,
  variant = "default",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  variant?: "default" | "danger" | "success";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        iconBtnClass,
        variant === "danger"
          ? "border-destructive/30 text-destructive hover:bg-destructive/10"
          : variant === "success"
            ? "border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
            : "border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

const navBtnClass =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const tableNavBtnClass =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function PanelNavAction({
  label,
  icon,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: ReactNode;
}) {
  return (
    <button type="button" className={cn(navBtnClass, className)} title={label} {...props}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function PanelNavActionLink({
  label,
  icon,
  href,
  className,
}: {
  label: string;
  icon: ReactNode;
  href: string;
  className?: string;
}) {
  return (
    <a href={href} className={cn(navBtnClass, className)} title={label}>
      {icon}
      <span>{label}</span>
    </a>
  );
}

function PanelTableNavAction({
  label,
  icon,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(tableNavBtnClass, className)}
      title={label}
      aria-label={label}
      {...props}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function PanelTableNavActionLink({
  label,
  icon,
  href,
  className,
}: {
  label: string;
  icon: ReactNode;
  href: string;
  className?: string;
}) {
  return (
    <a href={href} className={cn(tableNavBtnClass, className)} title={label} aria-label={label}>
      {icon}
      <span>{label}</span>
    </a>
  );
}

export type PanelTableNavItem = {
  label: string;
  kind: "ambientes" | "activos" | "responsables";
  href?: string;
  onClick?: () => void;
};

export interface PanelTableActionsProps {
  onEdit: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  /** @deprecated Use `navs` */
  nav?: PanelTableNavItem;
  navs?: PanelTableNavItem[];
}

function navIcon(kind: PanelTableNavItem["kind"]) {
  if (kind === "activos") return <ActivosIcon />;
  if (kind === "responsables") return <ResponsablesIcon />;
  return <AmbientesIcon />;
}

export function PanelTableActions({
  onEdit,
  onDelete,
  editLabel = "Editar",
  deleteLabel = "Eliminar",
  nav,
  navs,
}: PanelTableActionsProps) {
  const items = navs ?? (nav ? [nav] : []);

  return (
    <div className="flex flex-nowrap items-center justify-end gap-1">
      <PanelIconAction label={editLabel} onClick={onEdit}>
        <EditIcon />
      </PanelIconAction>
      {onDelete && (
        <PanelIconAction label={deleteLabel} variant="danger" onClick={onDelete}>
          <DeleteIcon />
        </PanelIconAction>
      )}
      {items.map((item) =>
        item.href ? (
          <PanelTableNavActionLink
            key={`${item.kind}-${item.label}`}
            href={item.href}
            label={item.label}
            icon={navIcon(item.kind)}
          />
        ) : (
          <PanelTableNavAction
            key={`${item.kind}-${item.label}`}
            label={item.label}
            icon={navIcon(item.kind)}
            onClick={item.onClick}
          />
        ),
      )}
    </div>
  );
}
