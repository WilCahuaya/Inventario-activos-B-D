import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface LabelPreviewProps {
  entidadNombre: string;
  codigoBarras: string;
  nombreBien: string;
}

export function LabelPreview({ entidadNombre, codigoBarras, nombreBien }: LabelPreviewProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !codigoBarras) return;
    try {
      JsBarcode(svgRef.current, codigoBarras, {
        format: "CODE128",
        displayValue: true,
        fontSize: 14,
        height: 56,
        margin: 4,
        width: 2,
      });
    } catch {
      svgRef.current.innerHTML = "";
    }
  }, [codigoBarras]);

  const entidadLine = `B&D - ${entidadNombre}`.slice(0, 36);

  return (
    <div className="mx-auto w-full max-w-md">
      <div
        className="rounded-md border-2 border-border bg-white p-3 text-black shadow-sm"
        style={{ aspectRatio: "2 / 1" }}
      >
        <p className="truncate text-center text-[11px] font-semibold leading-tight">{entidadLine}</p>
        <div className="mt-1 flex justify-center overflow-hidden">
          <svg ref={svgRef} className="max-h-[72px] max-w-full" />
        </div>
        <p className="mt-1 truncate text-center text-[10px] leading-tight text-gray-800">{nombreBien}</p>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Vista previa aproximada (50×25 mm)
      </p>
    </div>
  );
}
