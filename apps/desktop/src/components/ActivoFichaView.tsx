import {
  CATEGORIA_BIEN_LABELS,
  buildNombreConsolidado,
  categoriaBienCorto,
  formatCorrelativoCompleto,
  formatCorrelativoDisplay,
  formatFechaISOToDDMMYYYY,
  formatMonedaPE,
} from "@inventario/types";
import { useMemo, useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@inventario/ui";
import { StatusBadge } from "@inventario/ui/panel";
import { getActivoById, type ActivoConUbicacion } from "../lib/activos";
import { activoPrintSource, labelZplInputFromActivo } from "../lib/label-print";
import { FotoPreviewDialog, PdfPreviewDialog } from "./ActivoMediaDialogs";
import { CambiarAmbienteDialog } from "./CambiarAmbienteDialog";
import { DarDeBajaDialog } from "./DarDeBajaDialog";
import { PrintLabelDialog } from "./PrintLabelDialog";
import { ValidarPreregistroDialog } from "./ValidarPreregistroDialog";

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
      <dt className="text-xs font-semibold uppercase text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value?.trim() || "—"}</dd>
    </div>
  );
}

interface ActivoFichaViewProps {
  activo: ActivoConUbicacion;
  entidadId: string;
  entidadNombre: string;
  entidadNombreEtiqueta?: string | null;
  online: boolean;
  onEdit: () => void;
  onActivoUpdated: (activo: ActivoConUbicacion) => void;
}

export function ActivoFichaView({
  activo,
  entidadId,
  entidadNombre,
  entidadNombreEtiqueta,
  online,
  onEdit,
  onActivoUpdated,
}: ActivoFichaViewProps) {
  const [printOpen, setPrintOpen] = useState(false);
  const [validarOpen, setValidarOpen] = useState(false);
  const [bajaOpen, setBajaOpen] = useState(false);
  const [cambiarAmbienteOpen, setCambiarAmbienteOpen] = useState(false);
  const [fotoOpen, setFotoOpen] = useState(false);
  const [comprobanteOpen, setComprobanteOpen] = useState(false);
  const codigoEtiqueta = activo.codigo_barras ?? activo.codigo_catalogo;
  const esPendiente = activo.id.startsWith("pending-");
  const esPreregistrado = activo.estado_registro === "PREREGISTRADO";
  const inactivo = activo.estado_registro === "DADO_DE_BAJA";
  const nombreConsolidado = buildNombreConsolidado(
    activo.nombre,
    activo.marca,
    activo.modelo,
    activo.serie,
    activo.color,
    activo.medidas,
  );
  const labelPrint = useMemo(
    () =>
      labelZplInputFromActivo(activoPrintSource(activo), {
        nombre: entidadNombre,
        nombre_etiqueta: entidadNombreEtiqueta,
      }),
    [activo, entidadNombre, entidadNombreEtiqueta],
  );

  const estadoRegistro =
    esPreregistrado ? "Preregistrado" : inactivo ? "Dado de baja" : "Registrado";

  const estadoVariant = esPreregistrado ? "pending" : inactivo ? "default" : "active";

  return (
    <div className="space-y-4">
      {esPendiente && (
        <p className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm">
          Cambio pendiente de sincronizar con el servidor.
        </p>
      )}

      {esPreregistrado && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm">
          Este bien está <strong>preregistrado</strong>. Complételo y valídelo para asignar código de barras.
        </p>
      )}

      {inactivo && (
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
          Activo dado de baja{activo.motivo_baja ? `: ${activo.motivo_baja}` : "."}
        </p>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className={`text-xl ${inactivo ? "line-through decoration-muted-foreground/50" : ""}`}>
                {activo.nombre}
              </CardTitle>
              <p className="font-mono text-sm text-primary">{activo.codigo_barras ?? activo.codigo_catalogo}</p>
            </div>
            <StatusBadge variant={estadoVariant}>{estadoRegistro}</StatusBadge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Row label="Consolidado" value={nombreConsolidado} />
          {activo.nombre_etiqueta?.trim() && (
            <Row label="Nombre en etiqueta" value={activo.nombre_etiqueta} />
          )}
          <Row label="Estado" value={estadoRegistro} />
          <Row label="Categoría" value={`${categoriaBienCorto(activo.categoria)} — ${CATEGORIA_BIEN_LABELS[activo.categoria].titulo}`} />
          <Row
            label="Correlativo"
            value={
              activo.codigo_barras ??
              (formatCorrelativoCompleto(activo.codigo_catalogo, activo.correlativo) ||
                formatCorrelativoDisplay(activo.correlativo) ||
                null)
            }
          />
          <Row label="Sede" value={activo.sede_nombre} />
          <Row label="Ambiente" value={activo.ambiente_nombre} />
          <Row label="Marca / Modelo" value={[activo.marca, activo.modelo].filter(Boolean).join(" · ") || null} />
          <Row label="Serie" value={activo.serie} />
          <Row
            label="Valor"
            value={
              activo.valor_adquisicion != null
                ? `S/ ${formatMonedaPE(activo.valor_adquisicion)}${activo.valor_es_mercado ? " (mercado)" : ""}`
                : null
            }
          />
          <Row label="Fecha adq." value={formatFechaISOToDDMMYYYY(activo.fecha_adquisicion)} />
          <Row label="Depreciación" value={activo.depreciacion} />
          <Row label="Observación" value={activo.observacion} />
          {activo.motivo_baja && <Row label="Motivo baja" value={activo.motivo_baja} />}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {activo.foto_path && (
          <Button type="button" variant="outline" onClick={() => setFotoOpen(true)}>
            Ver foto
          </Button>
        )}
        {activo.comprobante_path && (
          <Button type="button" variant="outline" onClick={() => setComprobanteOpen(true)}>
            Ver comprobante
          </Button>
        )}
        {esPreregistrado && (
          <Button type="button" disabled={!online} onClick={() => setValidarOpen(true)}>
            Validar preregistro
          </Button>
        )}
        {!inactivo && (
          <Button type="button" variant={esPreregistrado ? "outline" : "default"} onClick={onEdit}>
            {esPreregistrado ? "Editar preregistro" : "Editar activo"}
          </Button>
        )}
        {!inactivo && !esPreregistrado && (
          <Button
            type="button"
            variant="secondary"
            disabled={!online}
            onClick={() => setCambiarAmbienteOpen(true)}
          >
            Cambiar ambiente
          </Button>
        )}
        {!inactivo && (
          <Button
            type="button"
            variant="outline"
            disabled={!codigoEtiqueta || esPreregistrado}
            title={esPreregistrado ? "Valide el preregistro para obtener código de barras" : undefined}
            onClick={() => setPrintOpen(true)}
          >
            Imprimir etiqueta
          </Button>
        )}
        {!inactivo && !esPreregistrado && (
          <Button
            type="button"
            variant="destructive"
            disabled={!online || esPendiente}
            onClick={() => setBajaOpen(true)}
          >
            Dar de baja
          </Button>
        )}
      </div>

      {codigoEtiqueta && !esPreregistrado && (
        <PrintLabelDialog
          open={printOpen}
          onClose={() => setPrintOpen(false)}
          label={labelPrint}
        />
      )}

      {esPreregistrado && (
        <ValidarPreregistroDialog
          open={validarOpen}
          onClose={() => setValidarOpen(false)}
          entidadId={entidadId}
          activoId={activo.id}
          nombre={activo.nombre}
          codigoCatalogo={activo.codigo_catalogo}
          onSuccess={onActivoUpdated}
        />
      )}

      <DarDeBajaDialog
        open={bajaOpen}
        onClose={() => setBajaOpen(false)}
        activoId={activo.id}
        nombre={activo.nombre}
        onSuccess={() => {
          void getActivoById(activo.id).then((updated) => {
            if (updated) onActivoUpdated(updated);
          });
        }}
      />

      <CambiarAmbienteDialog
        open={cambiarAmbienteOpen}
        onClose={() => setCambiarAmbienteOpen(false)}
        activo={activo}
        onSuccess={() => {
          void getActivoById(activo.id).then((updated) => {
            if (updated) onActivoUpdated(updated);
          });
        }}
      />

      {activo.foto_path && (
        <FotoPreviewDialog
          open={fotoOpen}
          onClose={() => setFotoOpen(false)}
          path={activo.foto_path}
          titulo={activo.nombre}
        />
      )}

      {activo.comprobante_path && (
        <PdfPreviewDialog
          open={comprobanteOpen}
          onClose={() => setComprobanteOpen(false)}
          path={activo.comprobante_path}
          titulo={activo.comprobante_serie ? `Comprobante ${activo.comprobante_serie}` : undefined}
        />
      )}
    </div>
  );
}
