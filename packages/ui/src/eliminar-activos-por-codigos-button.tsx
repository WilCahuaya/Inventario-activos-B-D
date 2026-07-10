"use client";

import { Button } from "./components";

export interface EliminarActivosPorCodigosButtonProps {
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
  size?: "sm" | "default";
}

export function EliminarActivosPorCodigosButton({
  onClick,
  disabled = false,
  disabledReason,
  size = "sm",
}: EliminarActivosPorCodigosButtonProps) {
  const compact = size === "sm";

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={
        compact
          ? "h-8 shrink-0 border-destructive/40 px-2 text-xs text-destructive hover:bg-destructive/10"
          : "border-destructive/40 text-destructive hover:bg-destructive/10"
      }
      disabled={disabled}
      title={disabled ? disabledReason : "Eliminar activos registrados por código de barras"}
      onClick={onClick}
    >
      Eliminar por códigos
    </Button>
  );
}
