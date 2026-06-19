import type { ReactNode } from "react";
import { Button, Input, Select } from "./components";
import { PanelBanner, PanelCountLabel, StatusBadge, panelCardClass } from "./panel";
import { PanelTableTd, PanelTableTh } from "./panel-table-layout";
import { panelStickyToolbarClass } from "./responsive-layout";

export interface ReporteDefinicionUI {
  id: string;
  label: string;
  descripcion: string;
  scope: "ambiente" | "entidad";
  formatos: ("pdf" | "excel")[];
  valorizado?: boolean;
}

export interface ReporteResumenGrupoUI {
  label: string;
  count: number;
}

export interface ReporteResumenPreviewUI {
  total: number;
  porEstado: ReporteResumenGrupoUI[];
  porUbicacion: ReporteResumenGrupoUI[];
  valorizacion?: {
    valorAdquisicion: string;
    depreciacionAcumulada: string;
    valorNeto: string;
  };
}

export interface ReportesPanelContentProps {
  reportes: ReporteDefinicionUI[];
  reporteId: string;
  onReporteIdChange: (id: string) => void;
  entidades: { id: string; nombre: string }[];
  entidadId: string;
  onEntidadChange: (id: string) => void;
  hideEntidadSelector?: boolean;
  entidadNombreFija?: string;
  sedes: { id: string; nombre: string }[];
  sedeId: string;
  onSedeChange: (id: string) => void;
  ambientes: { id: string; nombre: string }[];
  ambienteId: string;
  onAmbienteChange: (id: string) => void;
  fechaCorte: string;
  onFechaCorteChange: (value: string) => void;
  loading: boolean;
  pending: "pdf" | "excel" | null;
  error: string | null;
  disabled?: boolean;
  offlineBanner?: ReactNode;
  onPreview: () => void;
  onExport: (formato: "pdf" | "excel") => void;
  previewHeaders: readonly string[];
  previewRows: string[][];
  previewTotal: number;
  resumen: ReporteResumenPreviewUI | null;
  esAdmin?: boolean;
}

function FormatoBadge({ formato }: { formato: "pdf" | "excel" }) {
  return (
    <StatusBadge variant={formato === "pdf" ? "default" : "pending"}>
      {formato === "pdf" ? "PDF" : "Excel"}
    </StatusBadge>
  );
}

function ResumenGrupoList({
  titulo,
  items,
  vacio,
}: {
  titulo: string;
  items: ReporteResumenGrupoUI[];
  vacio: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/15 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{vacio}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {items.map((item) => (
            <li
              key={item.label}
              className="flex items-center justify-between gap-2 text-sm"
              title={item.label}
            >
              <span className="min-w-0 truncate text-foreground">{item.label}</span>
              <span className="shrink-0 font-medium tabular-nums text-muted-foreground">
                {item.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ReportesPanelContent({
  reportes,
  reporteId,
  onReporteIdChange,
  entidades,
  entidadId,
  onEntidadChange,
  hideEntidadSelector,
  entidadNombreFija,
  sedes,
  sedeId,
  onSedeChange,
  ambientes,
  ambienteId,
  onAmbienteChange,
  fechaCorte,
  onFechaCorteChange,
  loading,
  pending,
  error,
  disabled = false,
  offlineBanner,
  onPreview,
  onExport,
  previewHeaders,
  previewRows,
  previewTotal,
  resumen,
  esAdmin = false,
}: ReportesPanelContentProps) {
  const definicion = reportes.find((r) => r.id === reporteId) ?? reportes[0]!;
  const tieneVistaPrevia = previewTotal > 0 && previewRows.length > 0;
  const previewTruncado = previewTotal > previewRows.length;

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-5">
      {offlineBanner}

      <section className={`${panelCardClass} space-y-3 p-4 sm:p-5`}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">1. Tipo de reporte</h2>
            <p className="text-xs text-muted-foreground">
              Elija el documento a generar con membrete institucional B&amp;D
            </p>
          </div>
          <PanelCountLabel
            count={reportes.length}
            singular="tipo disponible"
            plural="tipos disponibles"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="reporte_tipo" className="text-xs font-medium text-muted-foreground">
            Reporte
          </label>
          <Select
            id="reporte_tipo"
            value={reporteId}
            disabled={disabled}
            onChange={onReporteIdChange}
            options={reportes.map((r) => ({ value: r.id, label: r.label }))}
          />
          <p className="text-xs text-muted-foreground">{definicion.descripcion}</p>
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge>{definicion.scope === "ambiente" ? "Por ambiente" : "Por entidad"}</StatusBadge>
            {definicion.valorizado && <StatusBadge variant="pending">Valorizado</StatusBadge>}
            {definicion.formatos.map((f) => (
              <FormatoBadge key={f} formato={f} />
            ))}
          </div>
        </div>
      </section>

      <section className={`${panelStickyToolbarClass} space-y-3 sm:space-y-4`}>
        <div>
          <h2 className="text-sm font-semibold text-foreground">2. Filtros y exportación</h2>
          <p className="text-xs text-muted-foreground">Configure alcance, fecha de corte y descargue el archivo</p>
        </div>

        {hideEntidadSelector && entidadNombreFija ? (
          <PanelBanner label="Entidad" title={entidadNombreFija} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:gap-4">
            <div className="space-y-1">
              <label htmlFor="reporte_entidad" className="text-xs font-medium text-muted-foreground">
                Entidad
              </label>
              <Select
                id="reporte_entidad"
                value={entidadId}
                disabled={disabled || hideEntidadSelector}
                onChange={onEntidadChange}
                options={[
                  { value: "", label: "Seleccione…" },
                  ...entidades.map((e) => ({ value: e.id, label: e.nombre })),
                ]}
              />
            </div>

            {definicion.scope === "ambiente" && (
              <>
                <div className="space-y-1">
                  <label htmlFor="reporte_sede" className="text-xs font-medium text-muted-foreground">
                    Sede
                  </label>
                  <Select
                    id="reporte_sede"
                    value={sedeId}
                    disabled={!entidadId || disabled}
                    onChange={onSedeChange}
                    options={[
                      { value: "", label: "Seleccione…" },
                      ...sedes.map((s) => ({ value: s.id, label: s.nombre })),
                    ]}
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="reporte_ambiente"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Ambiente
                  </label>
                  <Select
                    id="reporte_ambiente"
                    value={ambienteId}
                    disabled={!sedeId || disabled}
                    onChange={onAmbienteChange}
                    options={[
                      { value: "", label: "Seleccione…" },
                      ...ambientes.map((a) => ({ value: a.id, label: a.nombre })),
                    ]}
                  />
                </div>
              </>
            )}

            <div className="space-y-1">
              <label htmlFor="reporte_corte" className="text-xs font-medium text-muted-foreground">
                Fecha de corte
              </label>
              <Input
                id="reporte_corte"
                type="date"
                value={fechaCorte}
                disabled={disabled}
                onChange={(e) => onFechaCorteChange(e.target.value)}
              />
            </div>
          </div>
        )}

        {hideEntidadSelector && definicion.scope === "ambiente" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <label htmlFor="reporte_sede" className="text-xs font-medium text-muted-foreground">
                Sede
              </label>
              <Select
                id="reporte_sede"
                value={sedeId}
                disabled={!entidadId || disabled}
                onChange={onSedeChange}
                options={[
                  { value: "", label: "Seleccione…" },
                  ...sedes.map((s) => ({ value: s.id, label: s.nombre })),
                ]}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="reporte_ambiente" className="text-xs font-medium text-muted-foreground">
                Ambiente
              </label>
              <Select
                id="reporte_ambiente"
                value={ambienteId}
                disabled={!sedeId || disabled}
                onChange={onAmbienteChange}
                options={[
                  { value: "", label: "Seleccione…" },
                  ...ambientes.map((a) => ({ value: a.id, label: a.nombre })),
                ]}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="reporte_corte_admin" className="text-xs font-medium text-muted-foreground">
                Fecha de corte
              </label>
              <Input
                id="reporte_corte_admin"
                type="date"
                value={fechaCorte}
                disabled={disabled}
                onChange={(e) => onFechaCorteChange(e.target.value)}
              />
            </div>
          </div>
        )}

        {hideEntidadSelector && definicion.scope === "entidad" && (
          <div className="max-w-xs space-y-1">
            <label htmlFor="reporte_corte_ent" className="text-xs font-medium text-muted-foreground">
              Fecha de corte
            </label>
            <Input
              id="reporte_corte_ent"
              type="date"
              value={fechaCorte}
              disabled={disabled}
              onChange={(e) => onFechaCorteChange(e.target.value)}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-border/50 pt-4">
          <Button type="button" variant="secondary" disabled={loading || disabled} onClick={onPreview}>
            {loading ? "Cargando…" : "Vista previa"}
          </Button>
          {definicion.formatos.includes("excel") && (
            <Button
              type="button"
              variant="outline"
              disabled={pending !== null || !entidadId || disabled}
              onClick={() => onExport("excel")}
            >
              {pending === "excel" ? "Generando…" : "Descargar Excel"}
            </Button>
          )}
          {definicion.formatos.includes("pdf") && (
            <Button
              type="button"
              disabled={pending !== null || !entidadId || disabled}
              onClick={() => onExport("pdf")}
            >
              {pending === "pdf" ? "Generando…" : "Descargar PDF"}
            </Button>
          )}
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </section>

      {tieneVistaPrevia && resumen && (
        <section className={`${panelCardClass} space-y-4 p-4 sm:p-5`}>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground">3. Vista previa</h2>
              <p className="text-xs text-muted-foreground">
                Resumen y primeras filas del reporte antes de exportar
              </p>
            </div>
            <PanelCountLabel count={previewTotal} singular="registro" plural="registros" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:gap-4">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs font-medium text-muted-foreground">Total en reporte</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-primary">{resumen.total}</p>
            </div>
            {resumen.valorizacion && (
              <>
                <div className="rounded-lg border border-border/60 bg-muted/15 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Valor adquisición</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">S/ {resumen.valorizacion.valorAdquisicion}</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/15 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Dep. acumulada</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    S/ {resumen.valorizacion.depreciacionAcumulada}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/15 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Valor neto</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">S/ {resumen.valorizacion.valorNeto}</p>
                </div>
              </>
            )}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <ResumenGrupoList
              titulo="Por estado del bien"
              items={resumen.porEstado}
              vacio="Sin datos de estado"
            />
            <ResumenGrupoList
              titulo="Por ubicación"
              items={resumen.porUbicacion}
              vacio="Sin datos de ubicación"
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full min-w-[48rem] border-collapse text-left">
              <thead className="border-b border-border/60 bg-muted/40">
                <tr>
                  {previewHeaders.map((header) => (
                    <PanelTableTh key={header} className="whitespace-nowrap">
                      {header}
                    </PanelTableTh>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {previewRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-muted/25">
                    {row.map((cell, cellIndex) => (
                      <PanelTableTd key={cellIndex} title={cell}>
                        {cell}
                      </PanelTableTd>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {previewTruncado && (
            <p className="text-xs text-muted-foreground">
              Mostrando {previewRows.length} de {previewTotal} filas. El archivo exportado incluirá
              todos los registros.
            </p>
          )}
        </section>
      )}

      <div className={`${panelCardClass} p-4 text-sm text-muted-foreground`}>
        <p className="font-medium text-foreground">Formato institucional B&amp;D</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Membrete con razón social, RUC y fecha de corte</li>
          <li>Usuario generador y numeración de páginas en PDF</li>
          {esAdmin ? (
            <li>
              Fichas e inventarios sin valores monetarios, y reporte de bajas (acta y valorizados
              reservados al contador)
            </li>
          ) : (
            <>
              <li>Resumen por clasificación contable en reportes valorizados</li>
              <li>Acta con espacios para firmas (solo contador)</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
