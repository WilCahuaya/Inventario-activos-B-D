"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "./confirm-dialog";

export interface EliminarPreregistroDialogProps {
  open: boolean;
  onClose: () => void;
  activoId: string;
  nombre: string;
  onDelete: (activoId: string) => Promise<{ error?: string }>;
  onSuccess?: () => void;
}

export function EliminarPreregistroDialog({
  open,
  onClose,
  activoId,
  nombre,
  onDelete,
  onSuccess,
}: EliminarPreregistroDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPending(false);
      setError(null);
    }
  }, [open]);

  async function handleConfirm() {
    setPending(true);
    setError(null);
    const result = await onDelete(activoId);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onClose();
    onSuccess?.();
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title="Eliminar preregistro"
      description={`El bien preregistrado «${nombre}» se borrará definitivamente del inventario.`}
      confirmLabel="Eliminar"
      confirmVariant="destructive"
      pending={pending}
      error={error}
      onConfirm={() => void handleConfirm()}
    >
      <p className="text-sm text-muted-foreground">
        Esta acción no se puede deshacer. Use esto solo si el preregistro fue un error.
      </p>
    </ConfirmDialog>
  );
}
