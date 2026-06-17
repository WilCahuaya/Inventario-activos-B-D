import { useEffect, useState } from "react";
import type { Entidad } from "@inventario/types";
import type { ImportActivosResult } from "@inventario/types";
import { Button, Dialog, FileInput, Label, Select } from "@inventario/ui";
import { getImportActivosUbicaciones, importActivos } from "../lib/import-activos";
import {
  downloadImportActivosErrores,
  downloadImportActivosPlantilla,
  parseImportActivosWorkbook,
} from "../lib/import-activos-xlsx";

interface InventarioImportDialogProps {
  open: boolean;
  onClose: () => void;
  entidades: Entidad[];
  online: boolean;
  onImported?: () => void;
}

export function InventarioImportDialog({
  open,
  onClose,
  entidades,
  online,
  onImported,
}: InventarioImportDialogProps) {
  const [entidadId, setEntidadId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportActivosResult | null>(null);
  const [templatePending, setTemplatePending] = useState(false);

  const entidad = entidades.find((e) => e.id === entidadId);

  useEffect(() => {
    if (!open) {
      setEntidadId("");
      setFile(null);
      setPending(false);
      setParseError(null);
      setActionError(null);
      setResult(null);
      setTemplatePending(false);
    }
  }, [open]);

  async function handleDownloadPlantilla() {
    if (!entidadId || !entidad) return;
    setTemplatePending(true);
    setActionError(null);
    try {
      const ubicaciones = await getImportActivosUbicaciones(entidadId);
      if (ubicaciones.length === 0) {
        setActionError("La entidad no tiene ambientes activos.");
        return;
      }
      await downloadImportActivosPlantilla(entidad.nombre, ubicaciones);
    } catch (err) {
      console.error(err);
      setActionError("No se pudo generar la plantilla.");
    } finally {
      setTemplatePending(false);
    }
  }

  async function handleImport() {
    if (!entidadId || !file) return;
    if (!online) {
      setActionError("Se requiere conexión para importar activos.");
      return;
    }

    setPending(true);
    setParseError(null);
    setActionError(null);
    setResult(null);

    try {
      const parsed = await parseImportActivosWorkbook(file);
      if (parsed.error) {
        setParseError(parsed.error);
        return;
      }

      const response = await importActivos(entidadId, parsed.filas);
      if (response.error) {
        setActionError(response.error);
        return;
      }
      if (response.data) {
        setResult(response.data);
        if (response.data.importados > 0) {
          onImported?.();
        }
      }
    } catch (err) {
      console.error(err);
      setActionError("No se pudo completar la importación.");
    } finally {
      setPending(false);
    }
  }

  async function handleDownloadErrores() {
    if (!entidad || !result?.errores.length) return;
    await downloadImportActivosErrores(entidad.nombre, result.errores);
  }

  const canImport = Boolean(entidadId && file && !pending && online);
  const hasErrores = (result?.errores.length ?? 0) > 0;

  return (
    <Dialog open={open} onClose={onClose} title="Importar activos">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Importe activos de una entidad desde Excel. El correlativo y código de barras se asignan
          automáticamente. Use las columnas Sucursal y Ambiente para ubicar cada bien.
        </p>

        {!online && (
          <p className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            Sin conexión: la importación requiere estar en línea.
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="import_entidad">Entidad</Label>
          <Select
            id="import_entidad"
            value={entidadId}
            onChange={setEntidadId}
            options={[
              { value: "", label: "Seleccione entidad…" },
              ...entidades.map((e) => ({ value: e.id, label: e.nombre })),
            ]}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!entidadId || templatePending}
            onClick={() => void handleDownloadPlantilla()}
          >
            {templatePending ? "Generando…" : "Descargar plantilla"}
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="import_archivo">Archivo Excel (.xlsx)</Label>
          <FileInput
            id="import_archivo"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            file={file}
            onFileChange={(f) => {
              setFile(f);
              setParseError(null);
              setResult(null);
            }}
          />
        </div>

        {parseError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {parseError}
          </p>
        )}

        {actionError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {actionError}
          </p>
        )}

        {result && (
          <div className="space-y-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm">
            <p>
              Se importaron <strong>{result.importados}</strong> de{" "}
              <strong>{result.totalFilas}</strong> filas.
            </p>
            {hasErrores && (
              <p className="text-muted-foreground">
                {result.errores.length}{" "}
                {result.errores.length === 1 ? "fila no se importó" : "filas no se importaron"}.
                Corríjalas y vuelva a importar el archivo de errores.
              </p>
            )}
            {hasErrores && (
              <Button type="button" size="sm" variant="outline" onClick={() => void handleDownloadErrores()}>
                Descargar Excel de errores
              </Button>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-border/40 pt-3">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            {result ? "Cerrar" : "Cancelar"}
          </Button>
          {!result && (
            <Button type="button" size="sm" disabled={!canImport} onClick={() => void handleImport()}>
              {pending ? "Importando…" : "Importar"}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
