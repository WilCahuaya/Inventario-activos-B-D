import { useEffect, useState } from "react";
import { Button, Dialog } from "@inventario/ui";
import { getSavedPrinterName, setSavedPrinterName } from "../lib/offline";
import type { LabelZplInput } from "../lib/label-print";
import { buildBatchLabelZpl, LABELS_PER_ROW } from "../lib/zpl";
import { PrinterSelector, type PrinterOption } from "./PrinterSelector";

interface PrintBatchLabelDialogProps {
  open: boolean;
  onClose: () => void;
  labels: LabelZplInput[];
}

function pickInitialPrinter(printers: PrinterOption[], saved: string): string {
  if (saved && printers.some((p) => p.name === saved)) return saved;
  const defaultPrinter = printers.find((p) => p.isDefault);
  if (defaultPrinter) return defaultPrinter.name;
  return printers[0]?.name ?? "";
}

export function PrintBatchLabelDialog({ open, onClose, labels }: PrintBatchLabelDialogProps) {
  const [zpl, setZpl] = useState("");
  const [printers, setPrinters] = useState<PrinterOption[]>([]);
  const [printersLoading, setPrintersLoading] = useState(false);
  const [printerName, setPrinterName] = useState("");
  const [showZpl, setShowZpl] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const count = labels.length;
  const rowCount = Math.ceil(count / LABELS_PER_ROW);
  const entidadNombre = labels[0]?.entidadNombre ?? "Entidad";

  async function loadPrinters() {
    if (!window.electronAPI?.printListPrinters) {
      setPrinters([]);
      setPrinterName("");
      setMessage("La detección de impresoras solo funciona en la app de escritorio (Electron).");
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
    if (!open || labels.length === 0) return;
    setMessage(null);
    setShowZpl(false);
    setZpl(buildBatchLabelZpl(entidadNombre, labels));
    void loadPrinters();
  }, [open, labels, entidadNombre]);

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

  if (labels.length === 0) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Imprimir etiquetas por lote"
      description={`${count} etiqueta${count === 1 ? "" : "s"} · ${rowCount} fila${rowCount === 1 ? "" : "s"} (2 columnas de 50×25 mm)`}
      className="max-w-2xl"
    >
      <div className="space-y-5">
        <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border bg-muted/30 p-3 text-sm">
          {labels.map((label) => (
            <li key={label.codigoBarras} className="flex justify-between gap-2">
              <span className="truncate font-medium">{label.nombreBien}</span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {label.codigoBarras}
              </span>
            </li>
          ))}
        </ul>

        <PrinterSelector
          id="batch_printer_name"
          printers={printers}
          printersLoading={printersLoading}
          printerName={printerName}
          onPrinterNameChange={setPrinterName}
          onRefresh={() => void loadPrinters()}
        />

        <div className="space-y-2">
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => setShowZpl((v) => !v)}
          >
            {showZpl ? "Ocultar código ZPL" : "Ver código ZPL"}
          </button>
          {showZpl && (
            <pre className="max-h-32 overflow-auto rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-wrap">
              {zpl}
            </pre>
          )}
        </div>

        {message && (
          <p
            className={`text-sm ${message.includes("Error") || message.toLowerCase().includes("fall") ? "text-destructive" : "text-primary"}`}
          >
            {message}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
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
            {pending ? "Imprimiendo…" : `Imprimir ${count} etiqueta${count === 1 ? "" : "s"} (${rowCount} fila${rowCount === 1 ? "" : "s"})`}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
