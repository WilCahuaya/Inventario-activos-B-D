import type { Activo } from "@inventario/types";
import { ComprobanteInline } from "./ComprobanteInline";

interface ComprobanteCellProps {
  activo: Activo;
}

const cpTextClass = "text-[9px] leading-tight";

export function ComprobanteCell({ activo }: ComprobanteCellProps) {
  const serie = activo.comprobante_serie?.trim();
  const tienePdf = Boolean(activo.comprobante_path);

  if (!serie && !tienePdf) {
    return (
      <td
        className={`border-b border-r border-border/40 px-1.5 py-2 text-center ${cpTextClass} text-muted-foreground last:border-r-0`}
      >
        SIN CP
      </td>
    );
  }

  return (
    <td className="border-b border-r border-border/40 px-1.5 py-2 text-center last:border-r-0">
      <ComprobanteInline activo={activo} className={cpTextClass} />
    </td>
  );
}
