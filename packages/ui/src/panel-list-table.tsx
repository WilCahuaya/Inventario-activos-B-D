import type { ReactNode } from "react";
import { panelCardClass } from "./panel";

export function PanelDataTable({
  children,
  minWidth: _minWidth,
  layout = "fixed",
}: {
  children: ReactNode;
  /** @deprecated Las tablas usan ancho fluido sin scroll horizontal. */
  minWidth?: number;
  layout?: "fixed" | "auto";
}) {
  return (
    <div className={`${panelCardClass} min-w-0 max-w-full overflow-hidden`}>
      <table
        className={`min-w-0 w-full max-w-full text-left text-sm ${
          layout === "auto" ? "table-auto" : "table-fixed"
        }`}
      >
        {children}
      </table>
    </div>
  );
}

export const panelTableStickyHeadClass = "sticky top-0 z-10";

export const panelTableHeadRowClass =
  "border-b border-border/60 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground";

export const panelTableThClass =
  "max-w-0 overflow-hidden px-2 py-2.5 font-semibold sm:px-3";

export const panelTableBodyRowClass =
  "border-b border-border/40 last:border-b-0 transition-colors hover:bg-muted/30";

export const panelTableTdClass =
  "max-w-0 overflow-hidden px-2 py-2.5 align-middle sm:px-3";

export const panelTableMutedClass = "text-muted-foreground";
