"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./components";

export interface AmbienteReporteOpcion {
  id: string;
  label: string;
}

interface AmbienteReportesExportMenuProps {
  reportes: AmbienteReporteOpcion[];
  pending: string | null;
  onExport: (reporteId: string, formato: "pdf" | "excel") => void;
  disabled?: boolean;
  size?: "sm" | "default";
}

export function AmbienteReportesExportMenu({
  reportes,
  pending,
  onExport,
  disabled = false,
  size = "sm",
}: AmbienteReportesExportMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const compact = size === "sm";

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleExport(reporteId: string, formato: "pdf" | "excel") {
    onExport(reporteId, formato);
    setOpen(false);
  }

  const isBusy = pending !== null;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <Button
        type="button"
        variant="outline"
        size={size}
        className={compact ? "h-8 shrink-0 gap-1 px-2 text-xs" : "gap-1"}
        disabled={disabled || isBusy || reportes.length === 0}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        {isBusy ? "Generando…" : "Reportes"}
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-card p-1 shadow-lg"
        >
          <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Descargar reporte del ambiente
          </p>
          <ul className="space-y-0.5">
            {reportes.map((reporte) => (
              <li
                key={reporte.id}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60"
              >
                <span className="min-w-0 flex-1 text-xs leading-snug text-foreground">
                  {reporte.label}
                </span>
                <div className="flex shrink-0 gap-1">
                  {(["pdf", "excel"] as const).map((formato) => {
                    const key = `${reporte.id}:${formato}`;
                    const active = pending === key;
                    return (
                      <button
                        key={formato}
                        type="button"
                        role="menuitem"
                        disabled={isBusy}
                        className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                        onClick={() => handleExport(reporte.id, formato)}
                      >
                        {active ? "…" : formato}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
