"use client";

import type { Activo } from "@inventario/types";
import { inventarioTdComprobanteClass } from "@inventario/ui/panel";
import { ComprobanteInline } from "./ComprobanteInline";

interface ComprobanteCellProps {
  activo: Activo;
}

export function ComprobanteCell({ activo }: ComprobanteCellProps) {
  const serie = activo.comprobante_serie?.trim();
  const tienePdf = Boolean(activo.comprobante_path);

  if (!serie && !tienePdf) {
    return (
      <td className={`${inventarioTdComprobanteClass} text-muted-foreground`}>
        SIN CP
      </td>
    );
  }

  return (
    <td className={inventarioTdComprobanteClass} title={serie ?? "Comprobante PDF"}>
      <ComprobanteInline activo={activo} className="text-xs leading-snug" />
    </td>
  );
}
