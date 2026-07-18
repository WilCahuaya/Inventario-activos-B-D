"use client";

import { useEffect, useState } from "react";
import {
  formatComprobanteSerieInput,
  formatFechaInputDDMMYYYY,
  validarFechaDDMMYYYY,
} from "@inventario/types";
import { Button, Dialog, FechaDdMmYyyyInput, Input, Label } from "@inventario/ui";

export type ComprobanteFacturaDatos = {
  serie: string;
  fecha: string;
  monto: string;
};

interface ComprobanteSerieDialogProps {
  open: boolean;
  file?: File | null;
  fileName?: string;
  initialSerie?: string;
  initialFecha?: string;
  initialMonto?: string;
  onConfirm: (datos: ComprobanteFacturaDatos) => void;
  onCancel: () => void;
}

export function ComprobanteSerieDialog({
  open,
  file,
  fileName,
  initialSerie = "",
  initialFecha = "",
  initialMonto = "",
  onConfirm,
  onCancel,
}: ComprobanteSerieDialogProps) {
  const [serie, setSerie] = useState(initialSerie);
  const [fecha, setFecha] = useState(initialFecha);
  const [monto, setMonto] = useState(initialMonto);
  const [fechaError, setFechaError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const displayName = file?.name ?? fileName;
  const isPdf =
    Boolean(file) &&
    (file!.type === "application/pdf" ||
      file!.name.toLowerCase().endsWith(".pdf"));
  const isImage =
    Boolean(file) &&
    (file!.type.startsWith("image/") ||
      /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif|tiff?)$/i.test(file!.name));

  useEffect(() => {
    if (!open) return;
    setSerie(initialSerie);
    setFecha(initialFecha);
    setMonto(initialMonto);
    setFechaError(null);
  }, [open, initialSerie, initialFecha, initialMonto]);

  useEffect(() => {
    if (!open || !file || (!isPdf && !isImage)) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      setPreviewUrl(null);
    };
  }, [open, file, isPdf, isImage]);

  function handleConfirm() {
    const trimmedSerie = serie.trim();
    if (!trimmedSerie) return;

    const fechaTrim = fecha.trim();
    if (fechaTrim) {
      const error = validarFechaDDMMYYYY(fechaTrim);
      if (error) {
        setFechaError(error);
        return;
      }
    }

    onConfirm({
      serie: formatComprobanteSerieInput(trimmedSerie),
      fecha: fechaTrim ? formatFechaInputDDMMYYYY(fechaTrim) : "",
      monto: monto.trim(),
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title="Datos del comprobante"
      description={
        displayName
          ? `Revise el PDF e complete serie, fecha y monto de «${displayName}».`
          : "Complete serie, fecha y monto del comprobante."
      }
      className="max-w-none"
      style={{ width: "70vw", height: "90vh", maxWidth: "70vw", maxHeight: "90vh" }}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {previewUrl ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <p className="shrink-0 text-sm font-medium text-foreground">Vista previa</p>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/30">
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={displayName ?? "Vista previa del comprobante"}
                  className="max-h-full max-w-full object-contain p-2"
                />
              ) : (
                <iframe
                  title={`Vista previa de ${displayName ?? "comprobante"}`}
                  src={previewUrl}
                  className="h-full w-full"
                />
              )}
            </div>
          </div>
        ) : null}

        <div className="shrink-0 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="comprobante_serie_dialog">Serie del comprobante</Label>
              <Input
                id="comprobante_serie_dialog"
                value={serie}
                onChange={(e) => setSerie(formatComprobanteSerieInput(e.target.value))}
                placeholder="Ej. F/E001 - 0007"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleConfirm();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comprobante_fecha_dialog">Fecha de adquisición</Label>
              <FechaDdMmYyyyInput
                id="comprobante_fecha_dialog"
                value={fecha}
                onChange={(next) => {
                  setFecha(next);
                  if (fechaError) setFechaError(null);
                }}
                onBlur={() => {
                  if (fecha.trim()) setFechaError(validarFechaDDMMYYYY(fecha));
                }}
                aria-invalid={Boolean(fechaError)}
              />
              {fechaError && <p className="text-xs text-destructive">{fechaError}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="comprobante_monto_dialog">Monto (S/)</Label>
              <Input
                id="comprobante_monto_dialog"
                type="number"
                min="0"
                step="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleConfirm();
                  }
                }}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            La serie se muestra en la columna Comprobante. Fecha y monto se copian al formulario del
            activo.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={!serie.trim()}>
              Confirmar
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
