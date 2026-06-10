import type { ReactNode } from "react";
import { panelCardClass } from "./panel";

export function PanelDataTable({
  children,
  minWidth = 720,
}: {
  children: ReactNode;
  minWidth?: number;
}) {
  return (
    <div className={`${panelCardClass} overflow-x-auto`}>
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export const panelTableHeadRowClass =
  "border-b border-border/60 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground";

export const panelTableThClass = "px-4 py-3 font-semibold";

export const panelTableBodyRowClass = "border-b border-border/40 last:border-b-0";

export const panelTableTdClass = "px-4 py-3 align-middle";
