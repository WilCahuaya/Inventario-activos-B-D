"use client";

import { useState } from "react";
import { Button } from "@inventario/ui";
import { ValidarPreregistroDialog } from "./ValidarPreregistroDialog";

export function RegistrarActivoButton({
  activoId,
  nombre,
  codigoCatalogo,
  compact = false,
  onValidated,
}: {
  activoId: string;
  nombre: string;
  codigoCatalogo?: string;
  compact?: boolean;
  onValidated?: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={compact ? "h-7 px-2 text-[10px]" : undefined}
        onClick={() => setDialogOpen(true)}
      >
        {compact ? "Validar" : "Validar → REGISTRADO"}
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
