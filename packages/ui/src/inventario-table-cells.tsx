"use client";

import type { ReactNode } from "react";
import type { Activo, CategoriaBien, EstadoBien } from "@inventario/types";
import {
  buildDescripcionBien,
  calcDepreciacionAcumulada,
  calcPeriodoMeses,
  calcValorNeto,
  categoriaBienLetra,
  categoriaBienCorto,
  estadoBienLabel,
  formatActivoCodigoDisplay,
  formatCuentaContableDisplay,
  formatFechaISOToCortoES,
  formatFechaISOToDDMMYYYY,
  formatMonedaPE,
} from "@inventario/types";

export const INVENTARIO_TABLA_LEYENDA =
  "A = Activo · C = Cuenta de orden · PA = Precio adquisición · VM = Valor mercado";

const tdBase =
  "max-w-0 overflow-hidden border-b border-r border-border/40 px-2.5 py-2 text-xs leading-snug text-foreground last:border-r-0";

export const inventarioThStd =
  "max-w-0 overflow-hidden border-b border-r border-border/50 bg-muted/50 px-2.5 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-foreground/80 last:border-r-0";

export const inventarioThAccent =
  "max-w-0 overflow-hidden border-b border-r border-border/50 bg-primary/10 px-2.5 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-primary last:border-r-0";

export function InventarioTablaLeyenda({ className }: { className?: string }) {
  return (
    <p
      className={`border-t border-border/50 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground sm:px-4 sm:text-xs ${className ?? ""}`}
    >
      {INVENTARIO_TABLA_LEYENDA}
    </p>
  );
}

export function EstadoBienBadge({ estado }: { estado: EstadoBien }) {
  const label = estadoBienLabel(estado);
  const className =
    estado === "BUENO"
      ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
      : estado === "REGULAR"
        ? "bg-amber-500/15 text-amber-900 dark:text-amber-200"
        : "bg-red-500/15 text-red-800 dark:text-red-300";

  return (
    <span
      className={`inline-block max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-semibold sm:text-xs ${className}`}
    >
      {label}
    </span>
  );
}

export function InventarioEstadoRegistroFilaHint({
  activo,
  mostrarPreregistro = true,
}: {
  activo: Activo;
  mostrarPreregistro?: boolean;
}) {
  if (activo.estado_registro === "DADO_DE_BAJA") {
    return (
      <span className="mt-0.5 block text-[9px] font-semibold uppercase text-red-700 dark:text-red-300">
        Dado de baja
      </span>
    );
  }
  if (mostrarPreregistro && activo.estado_registro === "PREREGISTRADO") {
    return (
      <span className="mt-0.5 block text-[9px] font-medium uppercase text-amber-700 dark:text-amber-300">
        Pendiente de validación
      </span>
    );
  }
  return null;
}

export type ActivoConContabilidad = Activo & {
  cuenta_codigo?: string | null;
  contabilidad?: string | null;
};

export function inventarioCuentaContable(activo: ActivoConContabilidad): string {
  return formatCuentaContableDisplay(activo.cuenta_codigo, activo.contabilidad);
}

export function InventarioCodigoCellContent({ activo }: { activo: Activo }) {
  if (activo.estado_registro === "DADO_DE_BAJA") {
    return (
      <span className="inline-block rounded bg-red-500/15 px-1 py-0.5 text-[9px] font-semibold uppercase text-red-800 dark:text-red-200">
        Baja
      </span>
    );
  }
  if (activo.estado_registro === "PREREGISTRADO") {
    return (
      <span className="inline-block rounded bg-amber-500/20 px-1 py-0.5 text-[9px] font-semibold uppercase text-amber-800 dark:text-amber-200">
        Prereg.
      </span>
    );
  }
  return (
    <span className="block font-mono text-xs leading-snug">
      {formatActivoCodigoDisplay(activo)}
    </span>
  );
}

/** @deprecated Use InventarioCodigoCellContent */
export function InventarioCorrelativoCellContent({ activo }: { activo: Activo }) {
  return <InventarioCodigoCellContent activo={activo} />;
}

export function CategoriaLetraCell({
  categoria,
  fullOnWide,
}: {
  categoria: CategoriaBien;
  fullOnWide?: boolean;
}) {
  const letra = categoriaBienLetra(categoria);
  const titulo = categoria === "CUENTA_ORDEN" ? "Cuenta de orden" : "Activo";

  return (
    <td className={`${tdBase} text-center`} title={titulo}>
      {fullOnWide ? (
        <>
          <span className="hidden 3xl:inline">{categoriaBienCorto(categoria)}</span>
          <span className="3xl:hidden font-semibold">{letra}</span>
        </>
      ) : (
        <span className="font-semibold">{letra}</span>
      )}
    </td>
  );
}

export function ValorBienCell({ activo }: { activo: Activo }) {
  const esMercado = activo.valor_es_mercado;
  const monto = activo.valor_adquisicion;

  if (monto == null) {
    return (
      <td className={`${tdBase} text-center text-muted-foreground`}>
        —
      </td>
    );
  }

  const etiqueta = esMercado ? "VM" : "PA";
  const titulo = esMercado ? "Valor mercado" : "Precio adquisición";
  const badgeClass = esMercado
    ? "bg-amber-500/15 text-amber-900 dark:text-amber-200"
    : "bg-sky-500/15 text-sky-900 dark:text-sky-200";

  return (
    <td className={`${tdBase} text-right tabular-nums`} title={`${titulo}: S/ ${formatMonedaPE(monto)}`}>
      <span className="inline-flex max-w-full items-center justify-end gap-1">
        <span className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-bold ${badgeClass}`}>
          {etiqueta}
        </span>
        <span className="truncate text-[11px] sm:text-xs">{formatMonedaPE(monto)}</span>
      </span>
    </td>
  );
}

export function ValorNetoCell({
  activo,
  inactivo,
}: {
  activo: Activo;
  inactivo: boolean;
}) {
  const { valorNeto } = inventarioDepreciacionFila(activo, inactivo);

  return (
    <td className={`${tdBase} text-right tabular-nums`} title={valorNeto != null ? `S/ ${formatMonedaPE(valorNeto)}` : undefined}>
      {valorNeto != null ? (
        <span className="font-semibold text-primary">S/ {formatMonedaPE(valorNeto)}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </td>
  );
}

export function formatInventarioListaTexto(value?: string | null): string {
  const text = value?.trim() ?? "";
  return text ? text.toLocaleUpperCase("es") : "";
}

export function ObservacionCell({
  observacion,
  lineClamp2,
}: {
  observacion?: string | null;
  lineClamp2?: boolean;
}) {
  const texto = formatInventarioListaTexto(observacion);

  if (!texto) {
    return (
      <td className={`${tdBase} text-muted-foreground`}>
        —
      </td>
    );
  }

  return (
    <td className={tdBase} title={texto}>
      <span
        className={
          lineClamp2
            ? "line-clamp-2 text-xs leading-snug"
            : "block truncate text-xs leading-snug"
        }
      >
        {texto}
      </span>
    </td>
  );
}

export const inventarioTdFechaClass = `${tdBase} text-center text-xs whitespace-nowrap tabular-nums`;

export const inventarioTdComprobanteClass =
  "overflow-visible border-b border-r border-border/40 px-2.5 py-2 text-center align-top text-xs leading-snug text-foreground last:border-r-0";

export const inventarioTdAccionesClass =
  "inventario-td-acciones overflow-visible whitespace-nowrap border-b border-r border-border/40 px-1.5 py-2 text-xs text-foreground last:border-r-0";

export function InventarioValorPaVmCell({ activo }: { activo: Activo }) {
  const esMercado = activo.valor_es_mercado;
  const monto = activo.valor_adquisicion;
  if (monto == null) {
    return <InventarioTextCell className="text-right tabular-nums" />;
  }
  const texto = `S/ ${formatMonedaPE(monto)}`;
  const etiqueta = esMercado ? "Valor mercado" : "Precio adquisición";
  return (
    <InventarioTextCell
      className="text-right tabular-nums"
      title={`${etiqueta}: ${texto}`}
    >
      {texto}
    </InventarioTextCell>
  );
}

export function InventarioFechaCell({ fecha }: { fecha?: string | null }) {
  const corto = formatFechaISOToCortoES(fecha);
  const tabla = formatFechaISOToDDMMYYYY(fecha) || "—";
  return (
    <td className={inventarioTdFechaClass} title={corto || undefined}>
      {tabla}
    </td>
  );
}

export function InventarioTextCell({
  children,
  center,
  className,
  title,
  lineClamp2,
}: {
  children?: ReactNode;
  center?: boolean;
  className?: string;
  title?: string;
  lineClamp2?: boolean;
}) {
  const empty = children === null || children === undefined || children === "";
  return (
    <td
      className={`${tdBase} ${center ? "text-center" : ""} ${className ?? ""}`}
      title={title}
    >
      {empty ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <span className={lineClamp2 ? "line-clamp-2 text-xs leading-snug" : "block truncate text-xs leading-snug"}>
          {children}
        </span>
      )}
    </td>
  );
}

export function inventarioDescripcion(activo: Activo): string {
  return formatInventarioListaTexto(
    buildDescripcionBien(
      activo.marca,
      activo.modelo,
      activo.serie,
      activo.color,
      activo.medidas,
    ),
  );
}

export function inventarioDepreciacionFila(activo: Activo, inactivo: boolean) {
  const periodo = calcPeriodoMeses(activo.fecha_adquisicion);
  const depAcum = calcDepreciacionAcumulada(
    activo.valor_adquisicion,
    activo.vida_util_meses,
    periodo,
    inactivo,
  );
  const valorNeto = calcValorNeto(activo.valor_adquisicion, depAcum, inactivo);
  return { periodo, depAcum, valorNeto };
}
