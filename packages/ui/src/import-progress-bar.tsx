"use client";

import type { ImportProgress } from "@inventario/types";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function ImportProgressBar({
  progress,
  label = "Importando…",
  className,
}: {
  progress: ImportProgress;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-2 rounded-md border border-border/60 bg-muted/30 px-3 py-3",
        className,
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress.percent}
      aria-label={label}
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums font-semibold text-primary">{progress.percent}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {progress.current} de {progress.total} fila{progress.total === 1 ? "" : "s"}
      </p>
    </div>
  );
}
