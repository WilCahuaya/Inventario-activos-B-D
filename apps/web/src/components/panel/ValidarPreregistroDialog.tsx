"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { registrarActivo } from "@/lib/actions/activos";
import { ConfirmDialog } from "@inventario/ui";

interface ValidarPreregistroDialogProps {
  open: boolean;
  onClose: () => void;
  activoId: string;
  nombre: string;
  codigoCatalogo?: string;
  onSuccess?: () => void;
}

export function ValidarPreregistroDialog({
  open,
  onClose,
  activoId,
  nombre,
  codigoCatalogo,
  onSuccess,
}: ValidarPreregistroDialogProps) {
  const router = useRouter();
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

    if (result.error) {
      setError(result.error);
      return;
    }

    onClose();
    onSuccess?.();
    router.refresh();
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
