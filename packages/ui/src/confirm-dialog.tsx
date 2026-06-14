"use client";

import type { ReactNode } from "react";
import { Button, Dialog } from "./components";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "default" | "destructive" | "outline";
  pending?: boolean;
  error?: string | null;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmVariant = "default",
  pending = false,
  error,
  confirmDisabled = false,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title} description={description} className="max-w-md">
      <div className="space-y-4">
        {children}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            disabled={pending || confirmDisabled}
            onClick={onConfirm}
          >
            {pending ? "Procesando…" : confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
