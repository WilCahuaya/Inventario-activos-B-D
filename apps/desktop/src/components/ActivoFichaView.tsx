import {
  CATEGORIA_BIEN_LABELS,
  buildNombreConsolidado,
  categoriaBienCorto,
  formatCorrelativoCompleto,
  formatCorrelativoDisplay,
  formatEjemplaresEnAmbienteTexto,
  formatFechaISOToDDMMYYYY,
  formatMonedaPE,
} from "@inventario/types";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, cn } from "@inventario/ui";
import { StatusBadge } from "@inventario/ui/panel";
import {
  getActivoById,
  getEjemplaresSimilaresResumen,
  listActivosSimilaresParaEtiquetas,
  type ActivoConUbicacion,
} from "../lib/activos";
import { FotoPreviewDialog, PdfPreviewDialog } from "./ActivoMediaDialogs";
import { CambiarAmbienteDialog } from "./CambiarAmbienteDialog";
import { DarDeBajaDialog } from "./DarDeBajaDialog";
import { ValidarPreregistroDialog } from "./ValidarPreregistroDialog";
import { AgregarBienesSimilaresDialog } from "./AgregarBienesSimilaresDialog";

const fichaBtnClass = "h-7 shrink-0 whitespace-nowrap px-2.5 text-xs";

function hasText(value?: string | null): value is string {
  return Boolean(value?.trim());
}

function FichaTile({
  label,
  value,
  className,
  mono,
}: {
  label: string;
  value: ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border border-border/45 bg-muted/20 px-3 py-2.5",
        className,
      )}
    >
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className={cn("mt-1 text-sm leading-snug text-foreground", mono && "font-mono text-xs")}>
        {value}
      </dd>
    </div>
  );
}

function FichaTileOptional({
  label,
  value,
  className,
  mono,
}: {
  label: string;
  value?: string | null;
  className?: string;
  mono?: boolean;
}) {
  if (!hasText(value)) return null;
  return <FichaTile label={label} value={value.trim()} className={className} mono={mono} />;
}

function FichaSection({ title, children }: { title: string; children: ReactNode }) {
  const items = Array.isArray(children)
    ? children.filter((child) => child != null && child !== false)
    : [children];

  if (items.length === 0) return null;

  return (
    <section className="min-w-0 space-y-2 rounded-lg border border-border/50 bg-muted/10 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-primary">{title}</h3>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">{children}</dl>
    </section>
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
  onPrintBatch?: (activos: ActivoConUbicacion[]) => void;
}

export function ActivoFichaView({
  activo,
  entidadId,
  online,
  onEdit,
  onActivoUpdated,
  onPrintBatch,
}: ActivoFichaViewProps) {
  const [validarOpen, setValidarOpen] = useState(false);
  const [bajaOpen, setBajaOpen] = useState(false);
  const [cambiarAmbienteOpen, setCambiarAmbienteOpen] = useState(false);
  const [fotoOpen, setFotoOpen] = useState(false);
  const [comprobanteOpen, setComprobanteOpen] = useState(false);
  const [similaresOpen, setSimilaresOpen] = useState(false);
  const [ejemplaresLoading, setEjemplaresLoading] = useState(true);
  const [printEjemplaresPending, setPrintEjemplaresPending] = useState(false);
  const [ejemplares, setEjemplares] = useState<{
    total: number;
    registrados: number;
    preregistrados: number;
  } | null>(null);

  const reloadEjemplares = useCallback(() => {
    setEjemplaresLoading(true);
    void getEjemplaresSimilaresResumen(activo.id)
      .then(setEjemplares)
      .finally(() => setEjemplaresLoading(false));
  }, [activo.id]);

  useEffect(() => {
    reloadEjemplares();
  }, [reloadEjemplares]);

  async function handleImprimirEjemplares() {
    if (!onPrintBatch) return;
    setPrintEjemplaresPending(true);
    try {
      const activos = await listActivosSimilaresParaEtiquetas(activo.id);
      if (activos.length > 0) onPrintBatch(activos);
    } finally {
      setPrintEjemplaresPending(false);
    }
  }

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

  const estadoRegistro =
    esPreregistrado ? "Preregistrado" : inactivo ? "Dado de baja" : "Registrado";

  const estadoVariant = esPreregistrado ? "pending" : inactivo ? "default" : "active";

  const correlativo =
    activo.codigo_barras ??
    (formatCorrelativoCompleto(activo.codigo_catalogo, activo.correlativo) ||
      formatCorrelativoDisplay(activo.correlativo) ||
      null);

  const fechaAdquisicion = formatFechaISOToDDMMYYYY(activo.fecha_adquisicion);
  const valorTexto =
    activo.valor_adquisicion != null
      ? `S/ ${formatMonedaPE(activo.valor_adquisicion)}${activo.valor_es_mercado ? " (mercado)" : ""}`
      : null;
  const valorLabel = activo.valor_es_mercado ? "Valor de mercado" : "Precio de adquisición";
  const estadoBienLabel =
    activo.estado_bien === "BUENO" ? "Bueno" : activo.estado_bien === "REGULAR" ? "Regular" : "Malo";

  const tieneValorizacion =
    valorTexto != null ||
    hasText(fechaAdquisicion) ||
    hasText(activo.depreciacion) ||
    activo.vida_util_meses != null ||
    hasText(activo.comprobante_serie) ||
    activo.comprobante_path != null;

  const tieneObservacion = hasText(activo.observacion) || hasText(activo.motivo_baja);

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

      {inactivo && !hasText(activo.motivo_baja) && (
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
          Activo dado de baja.
        </p>
      )}

      <Card>
        <CardHeader className="space-y-0 pb-3">
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
            <div className="flex min-w-0 items-center gap-2">
              <CardTitle
                className={cn(
                  "truncate text-base font-semibold leading-tight",
                  inactivo && "line-through decoration-muted-foreground/50",
                )}
                title={activo.nombre}
              >
                {activo.nombre}
              </CardTitle>
              <span className="shrink-0 font-mono text-xs text-primary">
                {activo.codigo_barras ?? activo.codigo_catalogo}
              </span>
            </div>

            <div className="h-4 w-px shrink-0 bg-border/60" aria-hidden />

            <div className="flex shrink-0 items-center gap-1">
              {activo.foto_path && (
                <Button
                  type="button"
                  variant="outline"
                  className={fichaBtnClass}
                  onClick={() => setFotoOpen(true)}
                >
                  Ver foto
                </Button>
              )}
              {activo.comprobante_path && (
                <Button
                  type="button"
                  variant="outline"
                  className={fichaBtnClass}
                  onClick={() => setComprobanteOpen(true)}
                >
                  Ver comprobante
                </Button>
              )}
              {esPreregistrado && (
                <Button
                  type="button"
                  className={fichaBtnClass}
                  disabled={!online}
                  onClick={() => setValidarOpen(true)}
                >
                  Validar preregistro
                </Button>
              )}
              {!inactivo && (
                <Button
                  type="button"
                  className={fichaBtnClass}
                  variant={esPreregistrado ? "outline" : "default"}
                  onClick={onEdit}
                >
                  {esPreregistrado ? "Editar preregistro" : "Editar activo"}
                </Button>
              )}
              {!inactivo && (
                <Button
                  type="button"
                  className={fichaBtnClass}
                  variant="outline"
                  disabled={!online || esPendiente}
                  onClick={() => setSimilaresOpen(true)}
                >
                  Agregar similares
                </Button>
              )}
              {onPrintBatch && (ejemplares?.registrados ?? 0) > 0 && (
                <Button
                  type="button"
                  className={fichaBtnClass}
                  variant="outline"
                  disabled={!online || esPendiente || printEjemplaresPending}
                  onClick={() => void handleImprimirEjemplares()}
                >
                  {printEjemplaresPending
                    ? "Preparando…"
                    : `Imprimir ejemplares (${ejemplares?.registrados ?? 0})`}
                </Button>
              )}
              {!inactivo && !esPreregistrado && (
                <Button
                  type="button"
                  className={fichaBtnClass}
                  variant="secondary"
                  disabled={!online}
                  onClick={() => setCambiarAmbienteOpen(true)}
                >
                  Cambiar ambiente
                </Button>
              )}
              {!inactivo && !esPreregistrado && (
                <Button
                  type="button"
                  className={fichaBtnClass}
                  variant="destructive"
                  disabled={!online || esPendiente}
                  onClick={() => setBajaOpen(true)}
                >
                  Dar de baja
                </Button>
              )}
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              {!ejemplaresLoading && ejemplares && ejemplares.total > 0 && (
                <span className="whitespace-nowrap text-xs font-medium text-sky-500 dark:text-sky-300">
                  {formatEjemplaresEnAmbienteTexto(ejemplares)}
                </span>
              )}
              <StatusBadge variant={estadoVariant}>{estadoRegistro}</StatusBadge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-2">
            <FichaSection title="Identificación">
              <FichaTile
                label="Nombre consolidado"
                value={nombreConsolidado}
                className="col-span-2 sm:col-span-3"
              />
              <FichaTileOptional label="Nombre en etiqueta" value={activo.nombre_etiqueta} className="col-span-2 sm:col-span-3" />
              <FichaTile label="Estado" value={estadoRegistro} />
              <FichaTile
                label="Categoría"
                value={`${categoriaBienCorto(activo.categoria)} — ${CATEGORIA_BIEN_LABELS[activo.categoria].titulo}`}
              />
              <FichaTile label="Código catálogo" value={activo.codigo_catalogo} mono />
              <FichaTileOptional label="Correlativo" value={correlativo} mono />
              <FichaTileOptional label="Sede" value={activo.sede_nombre} />
              <FichaTileOptional label="Ambiente" value={activo.ambiente_nombre} className="col-span-2" />
            </FichaSection>

            <FichaSection title="Detalle del bien">
              <FichaTile label="Estado del bien" value={estadoBienLabel} />
              <FichaTileOptional label="Marca" value={activo.marca} />
              <FichaTileOptional label="Modelo" value={activo.modelo} />
              <FichaTileOptional label="Serie" value={activo.serie} mono />
              <FichaTileOptional label="Color" value={activo.color} />
              <FichaTileOptional label="Medidas" value={activo.medidas} className="col-span-2 sm:col-span-3" />
            </FichaSection>

            {tieneValorizacion && (
              <FichaSection title="Valorización">
                <FichaTileOptional label={valorLabel} value={valorTexto} />
                <FichaTileOptional label="Fecha de adquisición" value={fechaAdquisicion} />
                <FichaTileOptional label="Depreciación anual" value={activo.depreciacion} />
                {activo.vida_util_meses != null && (
                  <FichaTile label="Vida útil (meses)" value={String(activo.vida_util_meses)} />
                )}
                <FichaTileOptional label="Serie comprobante" value={activo.comprobante_serie} mono />
                {activo.comprobante_path && (
                  <FichaTile label="Comprobante" value="PDF adjunto" />
                )}
              </FichaSection>
            )}

            {tieneObservacion && (
              <FichaSection title="Observación">
                <FichaTileOptional
                  label="Observación"
                  value={activo.observacion}
                  className="col-span-2 sm:col-span-3"
                />
                <FichaTileOptional
                  label="Motivo de baja"
                  value={activo.motivo_baja}
                  className="col-span-2 sm:col-span-3"
                />
              </FichaSection>
            )}
          </div>
        </CardContent>
      </Card>

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

      <AgregarBienesSimilaresDialog
        open={similaresOpen}
        onClose={() => setSimilaresOpen(false)}
        activoId={activo.id}
        entidadId={entidadId}
        codigoCatalogo={activo.codigo_catalogo}
        nombre={activo.nombre}
        esRegistrado={!esPreregistrado}
        onSuccess={() => {
          reloadEjemplares();
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
