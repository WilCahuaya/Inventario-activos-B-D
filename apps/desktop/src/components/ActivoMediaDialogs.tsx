import { useEffect, useState } from "react";
import { Button, Dialog } from "@inventario/ui";
import { getSignedStorageUrl } from "../lib/storage-url";

interface PdfPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  path: string;
  titulo?: string;
}

export function PdfPreviewDialog({ open, onClose, path, titulo }: PdfPreviewDialogProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !path) {
      setUrl(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void getSignedStorageUrl("comprobantes-activos", path).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setUrl(result.url ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [open, path]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={titulo ?? "Comprobante de adquisición"}
      className="max-w-3xl"
    >
      <div className="space-y-4">
        {loading && <p className="text-sm text-muted-foreground">Cargando documento…</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {url && (
          <>
            <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/20">
              <iframe
                src={url}
                title={titulo ?? "Vista previa del comprobante"}
                className="h-[50vh] w-full sm:h-[60vh]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cerrar
              </Button>
              <a href={url} download target="_blank" rel="noopener noreferrer">
                <Button type="button" variant="secondary">
                  Descargar
                </Button>
              </a>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}

interface FotoPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  path: string;
  titulo?: string;
}

export function FotoPreviewDialog({ open, onClose, path, titulo }: FotoPreviewDialogProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !path) {
      setUrl(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void getSignedStorageUrl("fotos-activos", path).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setUrl(result.url ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [open, path]);

  return (
    <Dialog open={open} onClose={onClose} title={titulo ?? "Foto del activo"} className="max-w-3xl">
      <div className="space-y-4">
        {loading && <p className="text-sm text-muted-foreground">Cargando imagen…</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {url && (
          <>
            <div className="flex justify-center overflow-hidden rounded-lg border border-border/60 bg-muted/20 p-2">
              <img
                src={url}
                alt={titulo ?? "Foto del activo"}
                className="max-h-[50vh] max-w-full object-contain sm:max-h-[60vh]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cerrar
              </Button>
              <a href={url} download target="_blank" rel="noopener noreferrer">
                <Button type="button" variant="secondary">
                  Descargar
                </Button>
              </a>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
