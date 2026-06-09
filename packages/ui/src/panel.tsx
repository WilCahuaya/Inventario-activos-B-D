import type { ReactNode } from "react";
import { Input } from "./components";

export const panelCardClass =
  "overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm";
export const panelFieldsetClass =
  "space-y-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm";
export const panelLegendClass = "px-1 text-sm font-semibold text-foreground";

export const panelModalClass =
  "w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:w-[95vw] sm:max-w-[95vw] md:w-[88vw] md:max-w-[88vw] lg:w-[70vw] lg:max-w-[70vw]";

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

export function SearchIcon({ className = "h-4 w-4" }: { className?: string }) {
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
        d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
      />
    </svg>
  );
}

export function PanelPageHeader({
  title,
  subtitle,
  onBack,
  backLabel,
  actions,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <div>
      {onBack && backLabel && (
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-primary hover:underline"
        >
          ← {backLabel}
        </button>
      )}
      <div
        className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4 ${onBack ? "mt-3" : ""}`}
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

export function PanelBanner({
  label,
  title,
  subtitle,
}: {
  label: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">{label}</p>
      <p className="font-semibold text-primary">{title}</p>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export function PanelSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        <SearchIcon />
      </span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Buscar…"}
        className="pl-9"
      />
    </div>
  );
}

export function PanelEmptyState({
  message,
  action,
}: {
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-12 text-center">
      <p className="font-medium text-muted-foreground">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PanelCountLabel({
  count,
  singular,
  plural,
}: {
  count: number;
  singular: string;
  plural: string;
}) {
  return (
    <p className="text-sm text-muted-foreground">
      {count} {count === 1 ? singular : plural}
    </p>
  );
}

export function StatusBadge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "active" | "pending" | "default";
}) {
  const classes =
    variant === "active"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
      : variant === "pending"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
        : "bg-muted text-muted-foreground";

  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}>
      {children}
    </span>
  );
}

export function PanelToolbar({
  left,
  right,
}: {
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {left}
      {right}
    </div>
  );
}

export { TABLE_PAGE_SIZE, TablePagination, useTablePagination } from "./table-pagination";
