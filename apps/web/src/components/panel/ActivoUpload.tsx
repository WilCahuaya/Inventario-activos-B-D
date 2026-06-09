"use client";

import { useState } from "react";
import { Button } from "@inventario/ui";
import { updateActivoPaths } from "@/lib/actions/activos";
import { createClient } from "@/lib/supabase/client";

interface ActivoUploadProps {
  activoId: string;
  entidadId: string;
  fotoPath?: string | null;
  comprobantePath?: string | null;
}

export function ActivoUpload({ activoId, entidadId, fotoPath, comprobantePath }: ActivoUploadProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    setStatus(update.error ?? `${kind === "foto" ? "Foto" : "Comprobante"} subido correctamente.`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 text-sm">
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">Foto</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={loading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadFile(file, "foto");
          }}
        />
        {fotoPath && <span className="text-xs text-primary">✓ {fotoPath.split("/").pop()}</span>}
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">Comprobante PDF</span>
        <input
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          disabled={loading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadFile(file, "comprobante");
          }}
        />
        {comprobantePath && (
          <span className="text-xs text-primary">✓ {comprobantePath.split("/").pop()}</span>
        )}
      </label>
      {status && <p className="w-full text-xs text-muted-foreground">{status}</p>}
      {loading && (
        <Button type="button" variant="secondary" size="sm" disabled>
          Subiendo…
        </Button>
      )}
    </div>
  );
}
