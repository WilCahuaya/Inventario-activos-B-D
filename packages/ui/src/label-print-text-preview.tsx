import { useMemo } from "react";
import {
  fitLabelPrintLine,
  LABEL_PRINT_LAYOUT_FONTS,
  type LabelLineFit,
} from "@inventario/types";

interface LabelPrintTextPreviewProps {
  nombreBien: string;
  entidadNombre: string;
  className?: string;
}

const LABEL_WIDTH_MM = 50;
const LABEL_HEIGHT_MM = 25;

const labelFrameStyle = {
  width: `${LABEL_WIDTH_MM}mm`,
  height: `${LABEL_HEIGHT_MM}mm`,
} as const;

function previewFontSizeMm(font: number): string {
  if (font <= 16) return "1.7mm";
  if (font <= 18) return "1.9mm";
  return "2.2mm";
}

function fitNote(fit: LabelLineFit): string | null {
  if (fit.truncated) return "Texto truncado en impresión";
  if (fit.shrunk) return `Fuente reducida (${fit.font})`;
  return null;
}

function PreviewLine({ fit, className }: { fit: LabelLineFit; className?: string }) {
  const note = fitNote(fit);
  return (
    <div className={className}>
      <p
        className="truncate font-bold uppercase leading-tight text-black"
        style={{ fontSize: previewFontSizeMm(fit.font) }}
        title={fit.text}
      >
        {fit.text || "—"}
      </p>
      {note && <p className="mt-0.5 text-[1.5mm] text-amber-700">{note}</p>}
    </div>
  );
}

/** Vista previa compacta del texto nombre + entidad en etiqueta 50×25 mm. */
export function LabelPrintTextPreview({
  nombreBien,
  entidadNombre,
  className = "",
}: LabelPrintTextPreviewProps) {
  const nombreFit = useMemo(
    () => (nombreBien.trim() ? fitLabelPrintLine(nombreBien, LABEL_PRINT_LAYOUT_FONTS.nombre) : null),
    [nombreBien],
  );
  const entidadFit = useMemo(
    () =>
      entidadNombre.trim()
        ? fitLabelPrintLine(entidadNombre, LABEL_PRINT_LAYOUT_FONTS.entidad)
        : null,
    [entidadNombre],
  );

  if (!nombreFit && !entidadFit) return null;

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <p className="text-xs font-medium text-muted-foreground">Vista previa en etiqueta (50×25 mm)</p>
      <div className="mx-auto flex justify-center">
        <div
          className="relative overflow-hidden rounded-md border border-border bg-white shadow-sm"
          style={labelFrameStyle}
        >
          <div className="flex h-full flex-col justify-between p-[1.5mm] text-center">
            {nombreFit ? (
              <PreviewLine fit={nombreFit} />
            ) : (
              <p className="text-[1.8mm] text-muted-foreground">—</p>
            )}
            <div className="mt-auto space-y-[0.5mm] pt-[1mm]">
              <div className="mx-auto h-[4mm] w-[14mm] rounded-sm border border-dashed border-gray-300 bg-gray-50" />
              {entidadFit ? (
                <PreviewLine fit={entidadFit} />
              ) : (
                <p className="text-[1.8mm] text-muted-foreground">—</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
