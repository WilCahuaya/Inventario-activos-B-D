import { useEffect, useState } from "react";
import { MAX_ACTIVOS_SIMILARES_CANTIDAD } from "@inventario/types";
import { ConfirmDialog, Input, Label } from "@inventario/ui";
import {
  createActivosSimilares,
  previewActivosSimilares,
} from "../lib/activos";

interface AgregarBienesSimilaresDialogProps {
  open: boolean;
  onClose: () => void;
  activoId: string;
  entidadId: string;
  codigoCatalogo: string;
  nombre: string;
  esRegistrado: boolean;
  onSuccess?: (creados: number) => void;
}

export function AgregarBienesSimilaresDialog({
  open,
  onClose,
  activoId,
  entidadId,
  codigoCatalogo,
  nombre,
  esRegistrado,
  onSuccess,
}: AgregarBienesSimilaresDialogProps) {
  const [cantidad, setCantidad] = useState("10");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewText, setPreviewText] = useState<string | null>(null);

  const qty = Math.floor(Number(cantidad) || 0);
  const cantidadValida = qty >= 1 && qty <= MAX_ACTIVOS_SIMILARES_CANTIDAD;

  useEffect(() => {
    if (!open) {
      setCantidad("10");
      setError(null);
      setPending(false);
      setPreviewText(null);
      return;
    }

    if (!cantidadValida) {
      setPreviewText(null);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    void previewActivosSimilares(entidadId, codigoCatalogo, qty)
      .then((preview) => {
        if (cancelled) return;
        if (!preview) {
          setPreviewText(null);
          return;
        }
        if (preview.es_registrado && preview.primer_codigo && preview.ultimo_codigo) {
          setPreviewText(
            qty === 1
              ? `Código asignado: ${preview.primer_codigo}`
              : `Códigos: ${preview.primer_codigo} → ${preview.ultimo_codigo}`,
          );
        } else {
          setPreviewText("Quedarán como preregistrados (sin código hasta validación).");
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, entidadId, codigoCatalogo, qty, cantidadValida]);

  async function handleConfirm() {
    if (!cantidadValida) {
      setError(`Indique una cantidad entre 1 y ${MAX_ACTIVOS_SIMILARES_CANTIDAD}.`);
      return;
    }

    setPending(true);
    setError(null);
    const result = await createActivosSimilares(activoId, qty);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onClose();
    onSuccess?.(result.data?.creados ?? qty);
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title="Agregar bienes similares"
      description={`Se crearán copias de «${nombre}» con los mismos datos (sin serie, foto ni comprobante). El correlativo se asigna automáticamente.`}
      confirmLabel={cantidadValida ? `Crear ${qty} activo${qty === 1 ? "" : "s"}` : "Crear"}
      pending={pending}
      error={error}
      confirmDisabled={!cantidadValida}
      onConfirm={() => void handleConfirm()}
    >
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="cantidad_similares">Cantidad a registrar</Label>
          <Input
            id="cantidad_similares"
            type="number"
            min={1}
            max={MAX_ACTIVOS_SIMILARES_CANTIDAD}
            value={cantidad}
            onChange={(e) => {
              setCantidad(e.target.value);
              if (error) setError(null);
            }}
          />
          <p className="text-xs text-muted-foreground">
            Máximo {MAX_ACTIVOS_SIMILARES_CANTIDAD} por operación.
            {!esRegistrado && " Como plantilla preregistrada, las copias también serán preregistros."}
          </p>
        </div>
        {previewLoading && <p className="text-xs text-muted-foreground">Calculando códigos…</p>}
        {!previewLoading && previewText && (
          <p className="rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs text-foreground">
            {previewText}
          </p>
        )}
      </div>
    </ConfirmDialog>
  );
}
