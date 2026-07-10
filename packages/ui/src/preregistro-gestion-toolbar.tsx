"use client";

import { Button } from "./components";

export interface PreregistroGestionToolbarProps {
  totalPreregistrados: number;
  selectedCount: number;
  disabled?: boolean;
  disabledReason?: string;
  onEliminarSeleccionados: () => void;
  onVaciar: () => void;
  className?: string;
}

export type PreregistroGestionToolbarState = Omit<PreregistroGestionToolbarProps, "className">;

export function PreregistroGestionToolbar({
  totalPreregistrados,
  selectedCount,
  disabled = false,
  disabledReason,
  onEliminarSeleccionados,
  onVaciar,
  className,
}: PreregistroGestionToolbarProps) {
  if (totalPreregistrados <= 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 border-destructive/40 px-2 text-xs text-destructive hover:bg-destructive/10"
        disabled={disabled || selectedCount === 0}
        title={disabled ? disabledReason : undefined}
        onClick={onEliminarSeleccionados}
      >
        Eliminar seleccionados{selectedCount > 0 ? ` (${selectedCount})` : ""}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 border-destructive/40 px-2 text-xs text-destructive hover:bg-destructive/10"
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        onClick={onVaciar}
      >
        Vaciar preregistrados ({totalPreregistrados})
      </Button>
    </div>
  );
}
