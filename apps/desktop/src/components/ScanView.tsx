import { useEffect, useRef, useState } from "react";
import { Button, Label } from "@inventario/ui";
import type { ActivoConUbicacion } from "../lib/activos";
import { findActivoByCodigo } from "../lib/activos";

interface ScanViewProps {
  entidadId: string;
  entidadNombre: string;
  onFound: (activo: ActivoConUbicacion) => void;
  onRegisterNew: (codigoEscaneado: string) => void;
}

export function ScanView({ entidadId, entidadNombre, onFound, onRegisterNew }: ScanViewProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [codigo, setCodigo] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSearch(value?: string) {
    const trimmed = (value ?? codigo).trim();
    if (!trimmed) return;

    setPending(true);
    setError(null);
    setNotFound(null);

    try {
      const activo = await findActivoByCodigo(trimmed, entidadId, { allowCache: true });
      if (activo) {
        onFound(activo);
      } else {
        setNotFound(trimmed);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al buscar");
    } finally {
      setPending(false);
      setCodigo("");
      inputRef.current?.focus();
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Entidad: <strong className="text-foreground">{entidadNombre}</strong>. Apunte la pistola al
        campo y escanee el código de barras.
      </p>

      <div className="space-y-2">
        <Label htmlFor="scan_input">Código escaneado</Label>
        <input
          id="scan_input"
          ref={inputRef}
          value={codigo}
          autoComplete="off"
          placeholder="Escanee o escriba el código…"
          disabled={pending}
          className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-lg ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(e) => setCodigo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSearch();
          }}
        />
      </div>

      <Button type="button" disabled={pending || !codigo.trim()} onClick={() => void handleSearch()}>
        {pending ? "Buscando…" : "Buscar"}
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {notFound && (
        <div className="rounded-lg border border-border/70 bg-muted/30 p-4 space-y-3">
          <p className="text-sm">
            No se encontró un activo con código <strong className="font-mono">{notFound}</strong> en
            esta entidad.
          </p>
          <Button type="button" variant="secondary" onClick={() => onRegisterNew(notFound)}>
            Registrar como activo nuevo
          </Button>
        </div>
      )}
    </div>
  );
}
