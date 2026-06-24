import { useEffect, useState } from "react";
import { ConfirmDialog } from "@inventario/ui";
import { recuperarActivo } from "../lib/activos";

interface RecuperarActivoDialogProps {
  open: boolean;
  onClose: () => void;
  activoId: string;
  nombre: string;
  tieneCodigoBarras: boolean;
  onSuccess?: () => void;
}

export function RecuperarActivoDialog({
  open,
  onClose,
  activoId,
  nombre,
  tieneCodigoBarras,
  onSuccess,
}: RecuperarActivoDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setPending(false);
    }
  }, [open]);

  async function handleConfirm() {
    setPending(true);
    setError(null);
    try {
      const result = await recuperarActivo(activoId);
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
      onSuccess?.();
    } finally {
      setPending(false);
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title="Recuperar activo"
      description={`«${nombre}» volverá al inventario como ${
        tieneCodigoBarras ? "registrado" : "preregistrado"
      }. Se limpiará el motivo de baja.`}
      confirmLabel="Recuperar"
      pending={pending}
      error={error}
      onConfirm={() => void handleConfirm()}
    />
  );
}
