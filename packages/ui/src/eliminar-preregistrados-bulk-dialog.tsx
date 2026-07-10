"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "./confirm-dialog";
import { Input, Label } from "./components";

const CONFIRM_WORD = "ELIMINAR";

export type EliminarPreregistradosBulkMode = "seleccionados" | "vaciar";

export interface EliminarPreregistradosBulkDialogProps {
  open: boolean;
  onClose: () => void;
  mode: EliminarPreregistradosBulkMode;
  count: number;
  alcanceLabel?: string;
  onConfirm: () => Promise<{ error?: string }>;
  onSuccess?: () => void;
}

export function EliminarPreregistradosBulkDialog({
  open,
  onClose,
  mode,
  count,
  alcanceLabel,
  onConfirm,
  onSuccess,
}: EliminarPreregistradosBulkDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const requiereConfirmWord = mode === "vaciar";
  const canConfirm = !requiereConfirmWord || confirmText.trim().toUpperCase() === CONFIRM_WORD;

  useEffect(() => {
    if (open) {
      setPending(false);
      setError(null);
      setConfirmText("");
    }
  }, [open, mode]);

  async function handleConfirm() {
    if (!canConfirm || count <= 0) return;
    setPending(true);
    setError(null);
    const result = await onConfirm();
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onClose();
    onSuccess?.();
  }

  const title = mode === "vaciar" ? "Vaciar preregistrados" : "Eliminar seleccionados";
  const description =
    mode === "vaciar"
      ? `Se borrarán definitivamente ${count} bien${count === 1 ? "" : "es"} preregistrado${count === 1 ? "" : "s"}${alcanceLabel ? ` ${alcanceLabel}` : ""}.`
      : `Se borrarán definitivamente ${count} bien${count === 1 ? "" : "es"} preregistrado${count === 1 ? "" : "s"} seleccionado${count === 1 ? "" : "s"}.`;

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      confirmLabel={mode === "vaciar" ? "Vaciar" : "Eliminar"}
      confirmVariant="destructive"
      pending={pending}
      error={error}
      confirmDisabled={!canConfirm || count <= 0}
      onConfirm={() => void handleConfirm()}
    >
      <p className="text-sm text-muted-foreground">
        Esta acción no se puede deshacer. Use esto solo para corregir preregistros erróneos.
      </p>
      {requiereConfirmWord && (
        <div className="space-y-2">
          <Label htmlFor="vaciar_prereg_confirm">
            Escriba <strong>{CONFIRM_WORD}</strong> para confirmar
          </Label>
          <Input
            id="vaciar_prereg_confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_WORD}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      )}
    </ConfirmDialog>
  );
}
