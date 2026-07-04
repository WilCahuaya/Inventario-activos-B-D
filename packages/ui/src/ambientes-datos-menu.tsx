"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./components";

export type AmbientesDatosMenuAction = "import-ambientes" | "import-activos" | "eliminar-codigos";

interface AmbientesDatosMenuProps {
  onAction: (action: AmbientesDatosMenuAction) => void;
  importActivosDisabled?: boolean;
  importActivosDisabledReason?: string;
  disabled?: boolean;
  size?: "sm" | "default";
}

const MENU_WIDTH = 280;

function ChevronDown({ open }: { open: boolean }) {
  return (
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
  );
}

export function AmbientesDatosMenu({
  onAction,
  importActivosDisabled = false,
  importActivosDisabledReason,
  disabled = false,
  size = "sm",
}: AmbientesDatosMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const compact = size === "sm";

  useLayoutEffect(() => {
    if (!open) {
      setMenuRect(null);
      return;
    }

    function updatePosition() {
      const anchor = rootRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = Math.min(MENU_WIDTH, window.innerWidth - 16);
      const left = Math.min(
        Math.max(8, rect.right - width),
        window.innerWidth - width - 8,
      );
      setMenuRect({ top: rect.bottom + 4, left, width });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
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

  function handleSelect(action: AmbientesDatosMenuAction) {
    onAction(action);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <Button
        type="button"
        variant="outline"
        size={size}
        className={compact ? "h-8 shrink-0 gap-1 px-2 text-xs" : "gap-1"}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        Importar
        <ChevronDown open={open} />
      </Button>

      {open &&
        menuRect &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: "fixed",
              top: menuRect.top,
              left: menuRect.left,
              width: menuRect.width,
              zIndex: 9999,
            }}
            className="overflow-hidden rounded-lg border border-border bg-card p-1 shadow-lg"
          >
            <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Carga y eliminación masiva
            </p>
            <ul className="space-y-0.5">
              <li>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full rounded-md px-2 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted/60"
                  onClick={() => handleSelect("import-ambientes")}
                >
                  Importar ambientes
                </button>
              </li>
              <li>
                <button
                  type="button"
                  role="menuitem"
                  disabled={importActivosDisabled}
                  title={importActivosDisabled ? importActivosDisabledReason : undefined}
                  className="flex w-full rounded-md px-2 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => handleSelect("import-activos")}
                >
                  Importar activos
                </button>
              </li>
            </ul>
            <div className="my-1 border-t border-border/70" role="separator" />
            <ul>
              <li>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full rounded-md px-2 py-2 text-left text-xs text-destructive transition-colors hover:bg-destructive/10"
                  onClick={() => handleSelect("eliminar-codigos")}
                >
                  Eliminar activos por código de barras
                </button>
              </li>
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}
