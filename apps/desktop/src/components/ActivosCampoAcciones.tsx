import { useState } from "react";
import type { ActivoConUbicacion } from "../lib/activos";
import { Button } from "@inventario/ui";
import { ValidarPreregistroDialog } from "./ValidarPreregistroDialog";

interface ActivosCampoAccionesProps {
  entidadId: string;
  activo: ActivoConUbicacion;
  online: boolean;
  onOpenFicha: (activo: ActivoConUbicacion) => void;
  onPrintLabel: (activo: ActivoConUbicacion) => void;
  onValidated?: (activo: ActivoConUbicacion) => void;
  compact?: boolean;
}

export function ActivosCampoAcciones({
  entidadId,
  activo,
  online,
  onOpenFicha,
  onPrintLabel,
  onValidated,
  compact,
}: ActivosCampoAccionesProps) {
  const [validarOpen, setValidarOpen] = useState(false);
  const esPreregistrado = activo.estado_registro === "PREREGISTRADO";
  const inactivo = activo.estado_registro === "DADO_DE_BAJA";

  return (
    <>
      <div className={`flex flex-wrap gap-2 ${compact ? "flex-col sm:flex-row" : "justify-end"}`}>
        {esPreregistrado && (
          <Button
            type="button"
            size="sm"
            disabled={!online}
            title={online ? "Validar preregistro" : "Requiere conexión"}
            onClick={() => setValidarOpen(true)}
          >
            Validar
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => onOpenFicha(activo)}>
          Ver
        </Button>
        {!inactivo && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!activo.codigo_barras}
            title={activo.codigo_barras ? "Reimprimir etiqueta" : "Sin código de barras asignado"}
            onClick={() => onPrintLabel(activo)}
          >
            Etiqueta
          </Button>
        )}
      </div>

      {esPreregistrado && (
        <ValidarPreregistroDialog
          open={validarOpen}
          onClose={() => setValidarOpen(false)}
          entidadId={entidadId}
          activoId={activo.id}
          nombre={activo.nombre}
          codigoCatalogo={activo.codigo_catalogo}
          onSuccess={onValidated}
        />
      )}
    </>
  );
}
