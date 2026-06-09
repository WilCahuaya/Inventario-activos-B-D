"use client";

import { useEffect, useState } from "react";
import type { Activo } from "@inventario/types";
import { listHistorialActivo, type HistorialConUsuario } from "@/lib/actions/historial";
import {
  CATEGORIA_BIEN_LABELS,
  buildNombreConsolidado,
  calcDepreciacionAcumulada,
  calcPeriodoMeses,
  calcValorNeto,
  categoriaBienCorto,
  formatCorrelativoDisplay,
  formatFechaISOToDDMMYYYY,
  formatMonedaPE,
} from "@inventario/types";
import { Button, Dialog } from "@inventario/ui";
import { PdfPreviewDialog, FotoPreviewDialog } from "./ActivoMediaDialogs";
import { CambiarAmbienteDialog } from "./CambiarAmbienteDialog";
import { DarDeBajaDialog } from "./DarDeBajaDialog";
import { RegistrarActivoButton } from "./RegistrarActivoButton";
import { panelModalClass } from "./panel-ui";

type ActivoDetalle = Activo & {
  sede_nombre?: string;
  ambiente_nombre?: string;
};

interface ActivoDetalleModalProps {
  open: boolean;
  onClose: () => void;
  activo: ActivoDetalle;
  onEdit?: (activo: Activo) => void;
  puedeDarDeBaja?: boolean;
  puedeValidarPreregistro?: boolean;
  editarLabel?: string;
}

function DetalleRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[minmax(140px,180px)_1fr] sm:gap-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value?.trim() || "—"}</dd>
    </div>
  );
}

function formatHistorialFecha(iso: string) {
  return new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ActivoDetalleModal({
  open,
  onClose,
  activo,
  onEdit,
  puedeDarDeBaja = true,
  puedeValidarPreregistro = false,
  editarLabel = "Editar activo",
}: ActivoDetalleModalProps) {
  const [pdfOpen, setPdfOpen] = useState(false);
  const [fotoOpen, setFotoOpen] = useState(false);
  const [bajaDialogOpen, setBajaDialogOpen] = useState(false);
  const [cambiarAmbienteOpen, setCambiarAmbienteOpen] = useState(false);
  const [historial, setHistorial] = useState<HistorialConUsuario[]>([]);
  const [historialLoading, setHistorialLoading] = useState(false);
  const inactivo = activo.estado_registro === "DADO_DE_BAJA";

  useEffect(() => {
    if (!open) return;
    setHistorialLoading(true);
    void listHistorialActivo(activo.id)
      .then(setHistorial)
      .finally(() => setHistorialLoading(false));
  }, [open, activo.id]);

  const nombreConsolidado = buildNombreConsolidado(
    activo.nombre,
    activo.marca,
    activo.modelo,
    activo.serie,
    activo.color,
    activo.medidas,
  );
  const periodo = calcPeriodoMeses(activo.fecha_adquisicion);
  const depAcum = calcDepreciacionAcumulada(
    activo.valor_adquisicion,
    activo.vida_util_meses,
    periodo,
  );
  const valorNeto = calcValorNeto(activo.valor_adquisicion, depAcum);
  const pctDep = activo.depreciacion?.trim() || null;

  const precioAdq =
    activo.valor_adquisicion != null && !activo.valor_es_mercado
      ? `S/ ${formatMonedaPE(activo.valor_adquisicion)}`
      : null;
  const valorMercado =
    activo.valor_adquisicion != null && activo.valor_es_mercado
      ? `S/ ${formatMonedaPE(activo.valor_adquisicion)}`
      : null;

  function handleEditar() {
    onEdit?.(activo);
    onClose();
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title="Detalle del activo"
        description={nombreConsolidado || activo.nombre}
        className={panelModalClass}
      >
        <dl className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          <section className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-4">
            <h3 className="text-sm font-semibold text-primary">Identificación</h3>
            <DetalleRow label="Código catálogo" value={activo.codigo_catalogo} />
            <DetalleRow label="Correlativo" value={formatCorrelativoDisplay(activo.correlativo)} />
            <DetalleRow label="Código de barras" value={activo.codigo_barras} />
            <DetalleRow
              label="Categoría"
              value={`${categoriaBienCorto(activo.categoria)} — ${CATEGORIA_BIEN_LABELS[activo.categoria].titulo}`}
            />
            <DetalleRow
              label="Estado registro"
              value={
                activo.estado_registro === "PREREGISTRADO"
                  ? "Preregistrado"
                  : activo.estado_registro === "REGISTRADO"
                    ? "Registrado"
                    : "Dado de baja"
              }
            />
            {inactivo && activo.motivo_baja && (
              <DetalleRow label="Motivo de baja" value={activo.motivo_baja} />
            )}
            <DetalleRow label="Nombre del bien" value={activo.nombre} />
            <DetalleRow label="Nombre consolidado" value={nombreConsolidado} />
          </section>

          <section className="space-y-2 rounded-lg border border-border/50 p-4">
            <h3 className="text-sm font-semibold text-primary">Descripción y características</h3>
            <DetalleRow label="Marca" value={activo.marca} />
            <DetalleRow label="Modelo" value={activo.modelo} />
            <DetalleRow label="Serie" value={activo.serie} />
            <DetalleRow label="Color" value={activo.color} />
            <DetalleRow label="Medidas" value={activo.medidas} />
            <DetalleRow
              label="Estado del bien"
              value={
                activo.estado_bien === "BUENO"
                  ? "Bueno"
                  : activo.estado_bien === "REGULAR"
                    ? "Regular"
                    : "Malo"
              }
            />
            <DetalleRow label="Descripción" value={activo.descripcion} />
            <DetalleRow label="Observación" value={activo.observacion} />
          </section>

          <section className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-4">
            <h3 className="text-sm font-semibold text-primary">Valoración</h3>
            <DetalleRow label="Precio de adquisición" value={precioAdq} />
            <DetalleRow label="Valor de mercado" value={valorMercado} />
            <DetalleRow label="Fecha adquisición" value={formatFechaISOToDDMMYYYY(activo.fecha_adquisicion)} />
            <DetalleRow label="% Depreciación" value={pctDep ?? undefined} />
            <DetalleRow label="Vida útil (meses)" value={activo.vida_util_meses?.toString()} />
            <DetalleRow label="Periodo (meses)" value={periodo > 0 ? String(periodo) : undefined} />
            <DetalleRow
              label="Depreciación acumulada"
              value={depAcum != null ? `S/ ${formatMonedaPE(depAcum)}` : undefined}
            />
            <DetalleRow
              label="Valor neto"
              value={valorNeto != null ? `S/ ${formatMonedaPE(valorNeto)}` : undefined}
            />
            <DetalleRow
              label="Comprobante"
              value={
                activo.comprobante_serie?.trim() ||
                (activo.comprobante_path ? "PDF adjunto" : "Sin comprobante")
              }
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {activo.foto_path && (
                <Button type="button" size="sm" variant="outline" onClick={() => setFotoOpen(true)}>
                  Ver foto
                </Button>
              )}
              {activo.comprobante_path && (
                <Button type="button" size="sm" variant="outline" onClick={() => setPdfOpen(true)}>
                  Ver comprobante PDF
                </Button>
              )}
            </div>
          </section>

          <section className="space-y-2 rounded-lg border border-border/50 p-4">
            <h3 className="text-sm font-semibold text-primary">Ubicación</h3>
            <DetalleRow label="Sede" value={activo.sede_nombre} />
            <DetalleRow label="Ambiente" value={activo.ambiente_nombre} />
            <DetalleRow label="Responsable" value={activo.responsable} />
          </section>

          <section className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-4">
            <h3 className="text-sm font-semibold text-primary">Historial de cambios</h3>
            {historialLoading ? (
              <p className="text-sm text-muted-foreground">Cargando historial…</p>
            ) : historial.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin cambios registrados.</p>
            ) : (
              <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
                {historial.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-md border border-border/40 bg-background px-3 py-2"
                  >
                    <p className="font-medium text-foreground">
                      {item.accion}
                      {item.campo ? ` · ${item.campo}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatHistorialFecha(item.created_at)}
                      {item.usuario_nombre ? ` · ${item.usuario_nombre}` : ""}
                    </p>
                    {(item.valor_anterior || item.valor_nuevo) && (
                      <p className="mt-1 text-xs text-foreground/80">
                        {item.valor_anterior ? `${item.valor_anterior} → ` : ""}
                        {item.valor_nuevo ?? "—"}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </dl>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {puedeValidarPreregistro && activo.estado_registro === "PREREGISTRADO" && (
            <RegistrarActivoButton
              activoId={activo.id}
              nombre={activo.nombre}
              codigoCatalogo={activo.codigo_catalogo}
              onValidated={onClose}
            />
          )}
          {!inactivo && (
            <Button type="button" variant="secondary" onClick={() => setCambiarAmbienteOpen(true)}>
              Cambiar de ambiente
            </Button>
          )}
          {!inactivo && onEdit && (
            <Button type="button" onClick={handleEditar}>
              {editarLabel}
            </Button>
          )}
          {!inactivo && puedeDarDeBaja && (
            <Button type="button" variant="destructive" onClick={() => setBajaDialogOpen(true)}>
              Dar de baja
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </Dialog>

      {activo.comprobante_path && (
        <PdfPreviewDialog
          open={pdfOpen}
          onClose={() => setPdfOpen(false)}
          path={activo.comprobante_path}
          titulo={activo.comprobante_serie ?? "Comprobante"}
        />
      )}
      {activo.foto_path && (
        <FotoPreviewDialog
          open={fotoOpen}
          onClose={() => setFotoOpen(false)}
          path={activo.foto_path}
          titulo={activo.nombre}
        />
      )}

      <DarDeBajaDialog
        open={bajaDialogOpen}
        onClose={() => setBajaDialogOpen(false)}
        activoId={activo.id}
        nombre={activo.nombre}
        onSuccess={onClose}
      />

      <CambiarAmbienteDialog
        open={cambiarAmbienteOpen}
        onClose={() => setCambiarAmbienteOpen(false)}
        activo={activo}
        onSuccess={onClose}
      />
    </>
  );
}
