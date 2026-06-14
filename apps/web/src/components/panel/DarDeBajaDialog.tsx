"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@inventario/ui";
import { darDeBajaActivo } from "@/lib/actions/activos";
import { ConfirmDialog } from "@inventario/ui";

const textareaClass =
  "flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface DarDeBajaDialogProps {
  open: boolean;
  onClose: () => void;
  activoId: string;
  nombre: string;
  onSuccess?: () => void;
}

export function DarDeBajaDialog({
  open,
  onClose,
  activoId,
  nombre,
  onSuccess,
}: DarDeBajaDialogProps) {
  const router = useRouter();
  const [motivo, setMotivo] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMotivo("");
      setError(null);
      setPending(false);
    }
  }, [open]);

  async function handleConfirm() {
    const trimmed = motivo.trim();
    if (!trimmed) {
      setError("Indique el motivo de baja.");
      return;
    }

    setPending(true);
    setError(null);
    const result = await darDeBajaActivo(activoId, trimmed);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onClose();
    onSuccess?.();
    router.refresh();
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title="Dar de baja"
      description={`El activo «${nombre}» quedará marcado como dado de baja en el inventario.`}
      confirmLabel="Dar de baja"
      confirmVariant="destructive"
      pending={pending}
      error={error}
      confirmDisabled={!motivo.trim()}
      onConfirm={() => void handleConfirm()}
    >
      <div className="space-y-2">
        <Label htmlFor="motivo_baja">Motivo de baja</Label>
        <textarea
          id="motivo_baja"
          className={textareaClass}
          value={motivo}
          onChange={(e) => {
            setMotivo(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Ej. Obsoleto, deterioro irreparable, venta…"
          autoFocus
        />
        <p className="text-xs text-muted-foreground">Campo obligatorio. Quedará registrado en el historial.</p>
      </div>
    </ConfirmDialog>
  );
}
