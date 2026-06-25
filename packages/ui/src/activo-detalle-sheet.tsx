"use client";

import type { ReactNode } from "react";
import type { Activo } from "@inventario/types";
import {
  CATEGORIA_BIEN_LABELS,
  buildDescripcionBien,
  buildNombreConsolidado,
  categoriaBienCorto,
  formatActivoCodigoDisplay,
  formatCuentaContableDisplay,
  formatFechaISOToCortoES,
  formatMonedaPE,
} from "@inventario/types";
import { Button, cn } from "./components";
import { EstadoBienBadge, inventarioDepreciacionFila } from "./inventario-table-cells";
import { Sheet } from "./sheet";

export type ActivoDetalle = Activo & {
  entidad_nombre?: string;
  sede_nombre?: string;
  ambiente_nombre?: string;
  posible_ambiente_nombre?: string;
  cuenta_codigo?: string | null;
  contabilidad?: string | null;
};

function DetalleMetric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1 border-r border-border/50 px-3 py-2 last:border-r-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 truncate text-sm tabular-nums",
          highlight ? "font-semibold text-primary" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function DetalleField({
  label,
  value,
  className,
  mono,
}: {
  label: string;
  value?: ReactNode;
  className?: string;
  mono?: boolean;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-sm text-foreground", mono && "font-mono text-xs")}>{value}</p>
    </div>
  );
}

function DetalleSection({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {badge}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>
    </section>
  );
}

export function ActivoDetalleSheet({
  activo,
  open,
  onClose,
  footer,
  banner,
  ejemplaresHint,
  extraSections,
  onVerFoto,
  onVerComprobante,
}: {
  activo: ActivoDetalle;
  open: boolean;
  onClose: () => void;
  footer?: ReactNode;
  banner?: ReactNode;
  ejemplaresHint?: ReactNode;
  extraSections?: ReactNode;
  onVerFoto?: () => void;
  onVerComprobante?: () => void;
}) {
  const inactivo = activo.estado_registro === "DADO_DE_BAJA";
  const preregistrado = activo.estado_registro === "PREREGISTRADO";
  const { periodo, depAcum, valorNeto } = inventarioDepreciacionFila(activo, inactivo);
  const periodoTexto = periodo > 0 ? String(Math.round(periodo)) : "—";
  const esMercado = activo.valor_es_mercado;
  const precioLabel = esMercado ? "Valor mercado" : "Precio adquisición";
  const precioValor =
    activo.valor_adquisicion != null ? `S/ ${formatMonedaPE(activo.valor_adquisicion)}` : "—";
  const valorNetoTexto = valorNeto != null ? `S/ ${formatMonedaPE(valorNeto)}` : "—";

  const codigoTitulo = formatActivoCodigoDisplay(activo);

  const cuentaContable = formatCuentaContableDisplay(activo.cuenta_codigo, activo.contabilidad);

  const descripcion = buildDescripcionBien(
    activo.marca,
    activo.modelo,
    activo.serie,
    activo.color,
    activo.medidas,
  );

  const nombreConsolidado = buildNombreConsolidado(
    activo.nombre,
    activo.marca,
    activo.modelo,
    activo.serie,
    activo.color,
    activo.medidas,
    activo.caracteristicas,
  );

  const estadoRegistro = preregistrado
    ? "Preregistrado"
    : inactivo
      ? "Dado de baja"
      : "Registrado";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      subtitle="Bien"
      title={codigoTitulo}
      footer={footer}
    >
      <div className="space-y-5">
        {banner}

        <div>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3
              className={cn(
                "text-base font-semibold leading-snug text-foreground",
                inactivo && "line-through decoration-muted-foreground/50",
              )}
            >
              {activo.nombre}
            </h3>
            {ejemplaresHint}
          </div>
          {descripcion && (
            <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>
          )}
        </div>

        <div className="flex overflow-hidden rounded-xl border border-border/60 bg-muted/15">
          <DetalleMetric label={precioLabel} value={precioValor} />
          <DetalleMetric label="Valor neto" value={valorNetoTexto} highlight />
          <div className="min-w-0 flex-1 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Estado
            </p>
            <div className="mt-1">
              <EstadoBienBadge estado={activo.estado_bien} />
            </div>
          </div>
        </div>

        {(activo.entidad_nombre || activo.sede_nombre || activo.ambiente_nombre) && (
          <DetalleSection title="Ubicación">
            <DetalleField label="Entidad" value={activo.entidad_nombre} className="col-span-2" />
            <DetalleField label="Sede" value={activo.sede_nombre} />
            <DetalleField label="Ambiente" value={activo.ambiente_nombre} />
          </DetalleSection>
        )}

        <DetalleSection
          title="Identificación"
          badge={
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {estadoRegistro}
            </span>
          }
        >
          <DetalleField label="Categoría" value={categoriaBienCorto(activo.categoria)} />
          <DetalleField
            label="Tipo"
            value={CATEGORIA_BIEN_LABELS[activo.categoria].titulo}
            className="col-span-2 sm:col-span-1"
          />
          <DetalleField label="Código catálogo" value={activo.codigo_catalogo} mono />
          <DetalleField label="Código de barras" value={formatActivoCodigoDisplay(activo)} mono />
          <DetalleField
            label="Cuenta contable"
            value={cuentaContable !== "—" ? cuentaContable : undefined}
            className="col-span-2"
          />
          <DetalleField label="Nombre en etiqueta" value={activo.nombre_etiqueta} className="col-span-2" />
          <DetalleField label="Responsable" value={activo.responsable} className="col-span-2" />
          <DetalleField
            label="Fecha adquisición"
            value={formatFechaISOToCortoES(activo.fecha_adquisicion)}
          />
          <DetalleField label="Estado registro" value={estadoRegistro} />
        </DetalleSection>

        <DetalleSection title="Características">
          <DetalleField label="Nombre consolidado" value={nombreConsolidado} className="col-span-2" />
          <DetalleField label="Marca" value={activo.marca} />
          <DetalleField label="Modelo" value={activo.modelo} />
          <DetalleField label="Serie" value={activo.serie} mono />
          <DetalleField label="Color" value={activo.color} />
          <DetalleField label="Medidas" value={activo.medidas} />
          <DetalleField label="Detalle" value={activo.caracteristicas} className="col-span-2" />
        </DetalleSection>

        <DetalleSection title="Valorización">
          <DetalleField label={precioLabel} value={precioValor} />
          <DetalleField label="Periodo (meses)" value={periodoTexto} />
          <DetalleField label="Depreciación anual" value={activo.depreciacion?.trim()} />
          <DetalleField
            label="Deprec. acumulada"
            value={depAcum != null ? `S/ ${formatMonedaPE(depAcum)}` : undefined}
          />
          <DetalleField
            label="Vida útil (meses)"
            value={activo.vida_util_meses != null ? String(activo.vida_util_meses) : undefined}
          />
          <DetalleField label="Valor neto" value={valorNetoTexto} />
          <DetalleField label="Comprobante" value={activo.comprobante_serie?.trim() || (activo.comprobante_path ? "PDF adjunto" : undefined)} mono />
        </DetalleSection>

        {(activo.observacion?.trim() || activo.motivo_baja?.trim()) && (
          <DetalleSection title="Observación">
            <DetalleField label="Observación" value={activo.observacion} className="col-span-2" />
            <DetalleField label="Motivo de baja" value={activo.motivo_baja} className="col-span-2" />
          </DetalleSection>
        )}

        {(activo.foto_path || activo.comprobante_path) && (
          <section className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
            <h3 className="text-sm font-semibold text-foreground">Adjuntos</h3>
            <div className="flex flex-wrap gap-2">
              {activo.foto_path && onVerFoto && (
                <Button type="button" variant="outline" size="sm" onClick={onVerFoto}>
                  Ver foto
                </Button>
              )}
              {activo.comprobante_path && onVerComprobante && (
                <Button type="button" variant="outline" size="sm" onClick={onVerComprobante}>
                  Ver comprobante
                </Button>
              )}
            </div>
          </section>
        )}

        {extraSections}
      </div>
    </Sheet>
  );
}
