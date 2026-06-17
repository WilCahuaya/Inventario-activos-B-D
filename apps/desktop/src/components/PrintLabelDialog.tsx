"use client";

import { useEffect, useState } from "react";
import { Button, Dialog } from "@inventario/ui";
import { getSavedPrinterName, setSavedPrinterName } from "../lib/offline";
import type { LabelZplInput } from "../lib/label-print";
import { buildLabelPreviewZpl, buildLabelZpl } from "../lib/zpl";
import { LabelPreview } from "./LabelPreview";
import { PrinterSelector, type PrinterOption } from "./PrinterSelector";

interface PrintLabelDialogProps {
  open: boolean;
  onClose: () => void;
  label: LabelZplInput;
}

function pickInitialPrinter(printers: PrinterOption[], saved: string): string {
  if (saved && printers.some((p) => p.name === saved)) return saved;
  const defaultPrinter = printers.find((p) => p.isDefault);
  if (defaultPrinter) return defaultPrinter.name;
  return printers[0]?.name ?? "";
}

export function PrintLabelDialog({ open, onClose, label }: PrintLabelDialogProps) {
  const [zpl, setZpl] = useState("");
  const [previewZpl, setPreviewZpl] = useState("");
  const [printers, setPrinters] = useState<PrinterOption[]>([]);
  const [printersLoading, setPrintersLoading] = useState(false);
  const [printerName, setPrinterName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const { codigoBarras, entidadNombre, fechaAdquisicion, nombreBien } = label;

  async function loadPrinters() {
    if (!window.electronAPI?.printListPrinters) {
      setPrinters([]);
      setPrinterName("");
      setMessage("La detección de impresoras solo funciona en la app de escritorio.");
      return;
    }

    setPrintersLoading(true);
    setMessage(null);
    try {
      const list = await window.electronAPI.printListPrinters();
      const options = list as PrinterOption[];
      setPrinters(options);
      setPrinterName(pickInitialPrinter(options, getSavedPrinterName()));
      if (options.length === 0) {
        setMessage(
          "No se encontraron impresoras. Verifique que estén instaladas en Windows y pulse Actualizar lista.",
        );
      }
    } catch (err) {
      setPrinters([]);
      setPrinterName("");
      const msg = err instanceof Error ? err.message : "Error al detectar impresoras";
      setMessage(msg);
    } finally {
      setPrintersLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    setMessage(null);
    setZpl(buildLabelZpl(label));
    setPreviewZpl(buildLabelPreviewZpl(label));
    void loadPrinters();
  }, [open, label]);

  async function handlePrint() {
    if (!zpl) return;
    if (!printerName.trim()) {
      setMessage("Seleccione o escriba el nombre de una impresora.");
      return;
    }
    setPending(true);
    setMessage(null);
    setSavedPrinterName(printerName);
    const result = await window.electronAPI?.printSend?.(zpl, printerName);
    setPending(false);
    setMessage(result?.message ?? "No se pudo imprimir");
    if (result?.ok) onClose();
  }

  async function handleSave() {
    if (!zpl) return;
    if (!window.electronAPI?.printSaveDialog) {
      setMessage("Error: la app no está en modo escritorio (Electron).");
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const result = await window.electronAPI.printSaveDialog(zpl);
      if (result.saved && result.path) {
        setMessage(`Guardado en ${result.path}`);
      } else if (result.error) {
        setMessage(`Error al guardar: ${result.error}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al guardar el archivo";
      setMessage(`Error al guardar: ${msg}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Imprimir etiqueta"
      description={`${codigoBarras} · 50×25 mm · cinta 110 mm (2 columnas)`}
      className="max-w-md sm:max-w-xl"
    >
      <div className="space-y-3">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <div className="shrink-0 origin-top scale-[0.88] sm:scale-90">
            <LabelPreview
              previewZpl={previewZpl}
              entidadNombre={entidadNombre}
              codigoBarras={codigoBarras}
              nombreBien={nombreBien}
              fechaAdquisicion={fechaAdquisicion}
            />
          </div>

          <div className="min-w-0 w-full flex-1 space-y-3">
            <PrinterSelector
              id="printer_name"
              printers={printers}
              printersLoading={printersLoading}
              printerName={printerName}
              onPrinterNameChange={setPrinterName}
              onRefresh={() => void loadPrinters()}
            />

            {message && (
              <p
                className={`text-sm ${message.includes("Error") || message.toLowerCase().includes("fall") ? "text-destructive" : "text-primary"}`}
              >
                {message}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border/40 pt-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleSave()}
            disabled={pending || !zpl}
          >
            {pending ? "Guardando…" : "Guardar .zpl"}
          </Button>
          <Button
            type="button"
            onClick={() => void handlePrint()}
            disabled={pending || !zpl || !printerName.trim()}
          >
            {pending ? "Imprimiendo…" : "Imprimir"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
