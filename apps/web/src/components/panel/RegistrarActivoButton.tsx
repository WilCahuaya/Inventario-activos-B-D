"use client";

import { useState } from "react";
import { Button } from "@inventario/ui";
import { ValidarPreregistroDialog } from "./ValidarPreregistroDialog";

export function RegistrarActivoButton({
  activoId,
  nombre,
  codigoCatalogo,
  compact = false,
  label,
  className,
  onValidated,
}: {
  activoId: string;
  nombre: string;
  codigoCatalogo?: string;
  compact?: boolean;
  label?: string;
  className?: string;
  onValidated?: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const buttonLabel = label ?? (compact ? "Validar" : "Validar → REGISTRADO");

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={className ?? (compact ? "h-7 px-2 text-[10px]" : undefined)}
        onClick={() => setDialogOpen(true)}
      >
        {buttonLabel}
      </Button>

      <ValidarPreregistroDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        activoId={activoId}
        nombre={nombre}
        codigoCatalogo={codigoCatalogo}
        onSuccess={onValidated}
      />
    </>
  );
}
