"use client";

import { useEffect, useState } from "react";
import type { Entidad } from "@inventario/types";
import {
  MAX_ELIMINAR_ACTIVOS_POR_CODIGOS,
  formatCodigosBarrasLinesWithGuion,
  insertGuionCodigoBarras12,
  parseCodigosBarrasInputDetailed,
  type DeleteActivosPorCodigosResult,
  type PreviewDeleteActivosPorCodigosResult,
} from "@inventario/types";
import { Button, Dialog, Input, Label, Select, Textarea } from "./components";

const CONFIRM_WORD = "ELIMINAR";

export interface EliminarActivosPorCodigosDialogProps {
  open: boolean;
  onClose: () => void;
  entidades: Pick<Entidad, "id" | "nombre">[];
  /** Si se define, no se muestra selector de entidad. */
  fixedEntidadId?: string;
  modalClassName?: string;
  onPreview: (
    entidadId: string,
    codigosText: string,
  ) => Promise<{ data?: PreviewDeleteActivosPorCodigosResult; error?: string }>;
  onDelete: (
    entidadId: string,
    codigosText: string,
  ) => Promise<{ data?: DeleteActivosPorCodigosResult; error?: string }>;
  onDeleted?: () => void;
}

export function EliminarActivosPorCodigosDialog({
  open,
  onClose,
  entidades,
  fixedEntidadId,
  modalClassName = "max-w-lg",
  onPreview,
  onDelete,
  onDeleted,
}: EliminarActivosPorCodigosDialogProps) {
  const [entidadId, setEntidadId] = useState(fixedEntidadId ?? "");
  const [codigosText, setCodigosText] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [preview, setPreview] = useState<PreviewDeleteActivosPorCodigosResult | null>(null);
  const [previewPending, setPreviewPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const activeEntidadId = fixedEntidadId ?? entidadId;
  const parsed = parseCodigosBarrasInputDetailed(codigosText);
  const parsedCount = parsed.codigos.length;
  const hasInvalidos = parsed.invalidos.length > 0;
  const canPreview =
    Boolean(activeEntidadId) &&
    parsedCount > 0 &&
    !hasInvalidos &&
    parsedCount <= MAX_ELIMINAR_ACTIVOS_POR_CODIGOS &&
    !previewPending &&
    !deletePending;
  const canDelete =
    Boolean(preview) &&
    (preview?.encontrados.length ?? 0) > 0 &&
    (preview?.no_encontrados.length ?? 0) === 0 &&
    (preview?.no_elegibles.length ?? 0) === 0 &&
    confirmText.trim().toUpperCase() === CONFIRM_WORD &&
    !deletePending;

  useEffect(() => {
    if (!open) {
      setEntidadId(fixedEntidadId ?? "");
      setCodigosText("");
      setConfirmText("");
      setPreview(null);
      setPreviewPending(false);
      setDeletePending(false);
      setError(null);
      setSuccess(null);
    }
  }, [open, fixedEntidadId]);

  async function handlePreview() {
    if (!activeEntidadId) return;
    setPreviewPending(true);
    setError(null);
    setSuccess(null);
    setPreview(null);
    const result = await onPreview(activeEntidadId, codigosText);
    setPreviewPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.data) setPreview(result.data);
  }

  async function handleDelete() {
    if (!activeEntidadId || !canDelete) return;
    setDeletePending(true);
    setError(null);
    const result = await onDelete(activeEntidadId, codigosText);
    setDeletePending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    const n = result.data?.eliminados ?? 0;
    setSuccess(
      n === 1 ? "Se eliminó 1 activo correctamente." : `Se eliminaron ${n} activos correctamente.`,
    );
    onDeleted?.();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Eliminar por códigos"
      className={modalClassName}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Elimine físicamente activos <strong>registrados</strong> indicando sus códigos de barras
          (uno por línea o separados por coma). Use esto solo para corregir altas erróneas. La
          operación no se puede deshacer.
        </p>

        {!fixedEntidadId && (
          <div className="space-y-2">
            <Label htmlFor="eliminar_entidad">Entidad</Label>
            <Select
              id="eliminar_entidad"
              value={entidadId}
              onChange={(value) => {
                setEntidadId(value);
                setPreview(null);
                setSuccess(null);
              }}
              options={[
                { value: "", label: "Seleccione entidad…" },
                ...entidades.map((e) => ({ value: e.id, label: e.nombre })),
              ]}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="eliminar_codigos">Códigos de barras</Label>
          <Textarea
            id="eliminar_codigos"
            className="min-h-[120px] font-mono text-sm"
            value={codigosText}
            onChange={(e) => {
              const next = e.target.value;
              // El lector suele enviar Enter tras 12 dígitos: formatea líneas ya cerradas.
              const formatted = formatCodigosBarrasLinesWithGuion(next, {
                leaveLastIncomplete: true,
              });
              setCodigosText(formatted);
              setPreview(null);
              setSuccess(null);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const el = e.currentTarget;
              const { value, selectionStart } = el;
              const lineStart = value.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
              const currentLine = value.slice(lineStart, selectionStart).trim();
              const canAutoGuion =
                /^\d{12}$/.test(currentLine) ||
                /^BD\d{10}$/i.test(currentLine) ||
                /^24\d{10}$/.test(currentLine);
              if (!canAutoGuion) return;

              e.preventDefault();
              const formatted = insertGuionCodigoBarras12(currentLine);
              const next =
                value.slice(0, lineStart) + formatted + "\n" + value.slice(selectionStart);
              setCodigosText(next);
              setPreview(null);
              setSuccess(null);
              setError(null);
              requestAnimationFrame(() => {
                const pos = lineStart + formatted.length + 1;
                el.selectionStart = pos;
                el.selectionEnd = pos;
              });
            }}
            onBlur={() => {
              setCodigosText(formatCodigosBarrasLinesWithGuion(codigosText));
            }}
            placeholder={"746443220001\nBD000005-0002\n240000050003"}
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground">
            Una fila por código. Nacional: 12 dígitos (
            <code className="text-[0.7rem]">746443220001</code>) o con guion (
            <code className="text-[0.7rem]">74644322-0001</code>). Catálogo propio:{" "}
            <code className="text-[0.7rem]">BD000005-0002</code> (también el símbolo{" "}
            <code className="text-[0.7rem]">240000050002</code>).
          </p>
          {parsedCount > 0 && !hasInvalidos && (
            <p className="text-xs text-muted-foreground">
              {parsedCount} código{parsedCount === 1 ? "" : "s"} válido
              {parsedCount === 1 ? "" : "s"} (máx. {MAX_ELIMINAR_ACTIVOS_POR_CODIGOS}).
            </p>
          )}
          {hasInvalidos && (
            <p className="text-xs text-destructive">
              Formato inválido (nacional 12 dígitos / 8-4, o catálogo propio BD000001-0001):{" "}
              {parsed.invalidos.join(", ")}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canPreview}
            onClick={() => void handlePreview()}
          >
            {previewPending ? "Validando…" : "Validar códigos"}
          </Button>
        </div>

        {preview && (
          <div className="space-y-3 rounded-md border border-border/60 bg-muted/20 p-3 text-sm">
            {preview.encontrados.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium text-foreground">
                  Se eliminarán {preview.encontrados.length} activo
                  {preview.encontrados.length === 1 ? "" : "s"}:
                </p>
                <ul className="max-h-40 space-y-1 overflow-y-auto font-mono text-xs">
                  {preview.encontrados.map((item) => (
                    <li key={item.id} className="rounded bg-background px-2 py-1">
                      <span className="text-foreground">{item.codigo_barras}</span>
                      <span className="text-muted-foreground"> · {item.nombre}</span>
                      {(item.sede_nombre || item.ambiente_nombre) && (
                        <span className="block text-muted-foreground">
                          {[item.sede_nombre, item.ambiente_nombre].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {preview.no_encontrados.length > 0 && (
              <p className="text-destructive">
                No encontrados: {preview.no_encontrados.join(", ")}
              </p>
            )}

            {preview.no_elegibles.length > 0 && (
              <ul className="space-y-1 text-destructive">
                {preview.no_elegibles.map((item) => (
                  <li key={item.codigo_barras}>
                    {item.codigo_barras}: estado {item.estado_registro} (solo registrados)
                  </li>
                ))}
              </ul>
            )}

            {preview.encontrados.length > 0 &&
              preview.no_encontrados.length === 0 &&
              preview.no_elegibles.length === 0 && (
                <div className="space-y-2 border-t border-border/50 pt-3">
                  <Label htmlFor="eliminar_confirm">
                    Escriba <strong>{CONFIRM_WORD}</strong> para confirmar
                  </Label>
                  <Input
                    id="eliminar_confirm"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={CONFIRM_WORD}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              )}
          </div>
        )}

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground">
            {success}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-border/50 pt-3">
          <Button type="button" variant="outline" onClick={onClose}>
            {success ? "Cerrar" : "Cancelar"}
          </Button>
          {!success && (
            <Button
              type="button"
              variant="destructive"
              disabled={!canDelete}
              onClick={() => void handleDelete()}
            >
              {deletePending
                ? "Eliminando…"
                : preview
                  ? `Eliminar ${preview.encontrados.length} activo${preview.encontrados.length === 1 ? "" : "s"}`
                  : "Eliminar"}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
