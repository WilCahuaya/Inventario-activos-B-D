"use client";

import { useRef, useState } from "react";
import { Button, FileInput } from "@inventario/ui";
import { updateActivoPaths } from "@/lib/actions/activos";
import { createClient } from "@/lib/supabase/client";

interface ActivoUploadProps {
  activoId: string;
  entidadId: string;
  fotoPath?: string | null;
  comprobantePath?: string | null;
  compact?: boolean;
}

export function ActivoUpload({
  activoId,
  entidadId,
  fotoPath,
  comprobantePath,
  compact = false,
}: ActivoUploadProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fotoRef = useRef<HTMLInputElement>(null);
  const comprobanteRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File, kind: "foto" | "comprobante") {
    setLoading(true);
    setStatus(null);

    const bucket = kind === "foto" ? "fotos-activos" : "comprobantes-activos";
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `${entidadId}/${activoId}/${kind}.${ext}`;

    const supabase = createClient();
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

    if (uploadError) {
      setLoading(false);
      setStatus(uploadError.message);
      return;
    }

    const update = await updateActivoPaths(activoId, {
      ...(kind === "foto" ? { foto_path: path } : { comprobante_path: path }),
    });

    setLoading(false);
    setStatus(update.error ?? null);
  }

  if (compact) {
    return (
      <div className="flex min-w-[108px] flex-col gap-1">
        <input
          ref={fotoRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={loading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadFile(file, "foto");
            e.target.value = "";
          }}
        />
        <input
          ref={comprobanteRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          className="hidden"
          disabled={loading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadFile(file, "comprobante");
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          size="sm"
          variant={fotoPath ? "secondary" : "outline"}
          className="h-7 px-2 text-[10px]"
          disabled={loading}
          onClick={() => fotoRef.current?.click()}
        >
          {fotoPath ? "✓ Foto" : "Foto"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={comprobantePath ? "secondary" : "outline"}
          className="h-7 px-2 text-[10px]"
          disabled={loading}
          onClick={() => comprobanteRef.current?.click()}
        >
          {comprobantePath ? "✓ CP" : "Comprobante"}
        </Button>
        {loading && <span className="text-[10px] text-muted-foreground">Subiendo…</span>}
        {status && <span className="text-[10px] text-destructive">{status}</span>}
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="space-y-1">
        <span className="text-sm font-medium">Foto</span>
        <FileInput
          accept="image/jpeg,image/png,image/webp"
          disabled={loading}
          buttonLabel="Seleccionar foto"
          emptyLabel="Sin foto adjunta"
          hint={fotoPath ? `Actual: ${fotoPath.split("/").pop()}` : undefined}
          onFileChange={(file) => {
            if (file) void uploadFile(file, "foto");
          }}
        />
      </div>
      <div className="space-y-1">
        <span className="text-sm font-medium">Comprobante PDF</span>
        <FileInput
          accept="application/pdf,image/jpeg,image/png"
          disabled={loading}
          buttonLabel="Seleccionar PDF"
          emptyLabel="Sin archivo adjunto"
          hint={comprobantePath ? `Actual: ${comprobantePath.split("/").pop()}` : undefined}
          onFileChange={(file) => {
            if (file) void uploadFile(file, "comprobante");
          }}
        />
      </div>
      {status && <p className="text-xs text-destructive">{status}</p>}
      {loading && (
        <Button type="button" variant="secondary" size="sm" disabled>
          Subiendo…
        </Button>
      )}
    </div>
  );
}
