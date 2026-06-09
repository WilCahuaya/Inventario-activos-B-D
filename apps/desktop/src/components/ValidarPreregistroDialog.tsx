import { useEffect, useState } from "react";
import type { ActivoConUbicacion } from "../lib/activos";
import { registrarActivo } from "../lib/activos";
import { upsertCachedActivo } from "../lib/offline";
import { ConfirmDialog } from "./ConfirmDialog";

interface ValidarPreregistroDialogProps {
  open: boolean;
  onClose: () => void;
  entidadId: string;
  activoId: string;
  nombre: string;
  codigoCatalogo?: string;
  onSuccess?: (activo: ActivoConUbicacion) => void;
}

export function ValidarPreregistroDialog({
  open,
  onClose,
  entidadId,
  activoId,
  nombre,
  codigoCatalogo,
  onSuccess,
}: ValidarPreregistroDialogProps) {
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
    const result = await registrarActivo(activoId);
    setPending(false);

    if (result.error || !result.data) {
      setError(result.error ?? "No se pudo validar el preregistro.");
      return;
    }

    await upsertCachedActivo(entidadId, result.data);
    onClose();
    onSuccess?.(result.data);
  }

  const descripcion = codigoCatalogo
    ? `«${nombre}» (catálogo ${codigoCatalogo}) pasará a estado REGISTRADO y se le asignará un código de barras.`
    : `«${nombre}» pasará a estado REGISTRADO y se le asignará un código de barras.`;

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title="Validar preregistro"
      description={descripcion}
      confirmLabel="Validar y registrar"
      pending={pending}
      error={error}
      onConfirm={() => void handleConfirm()}
    />
  );
}
