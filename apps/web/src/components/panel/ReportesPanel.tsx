"use client";

import { useEffect, useMemo, useState } from "react";
import type { Ambiente, Entidad, Sede } from "@inventario/types";
import { Button } from "@inventario/ui";
import { cargarActivosReporte } from "@/lib/actions/reportes";
import { listAmbientes, listSedes } from "@/lib/actions/ubicacion";
import {
  REPORTES,
  exportReporte,
  type ActivoReporte,
  type ReporteFormato,
  type ReporteId,
} from "@/lib/reportes";
import { panelCardClass } from "./panel-ui";

interface ReportesPanelProps {
  entidades: Entidad[];
  usuarioNombre: string;
  usuarioEmail: string;
  esAdmin?: boolean;
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export function ReportesPanel({
  entidades,
  usuarioNombre,
  usuarioEmail,
  esAdmin = false,
}: ReportesPanelProps) {
  const reportesDisponibles = useMemo(
    () => (esAdmin ? REPORTES.filter((r) => !r.soloContador && !r.valorizado) : REPORTES),
    [esAdmin],
  );

  const [reporteId, setReporteId] = useState<ReporteId>(reportesDisponibles[0].id);
  const [entidadId, setEntidadId] = useState(entidades[0]?.id ?? "");
  const [sedeId, setSedeId] = useState("");
  const [ambienteId, setAmbienteId] = useState("");
  const [fechaCorte, setFechaCorte] = useState(hoyISO);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [activos, setActivos] = useState<ActivoReporte[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<ReporteFormato | null>(null);

  const definicion = reportesDisponibles.find((r) => r.id === reporteId)!;
  const entidad = entidades.find((e) => e.id === entidadId);
  const ambiente = ambientes.find((a) => a.id === ambienteId);
  const sede = sedes.find((s) => s.id === sedeId);

  useEffect(() => {
    if (!entidadId) {
      setSedes([]);
      setSedeId("");
      setAmbienteId("");
      return;
    }
    void listSedes(entidadId).then(setSedes);
  }, [entidadId]);

  useEffect(() => {
    if (!sedeId) {
      setAmbientes([]);
      return;
    }
    void listAmbientes(sedeId).then(setAmbientes);
  }, [sedeId]);

  useEffect(() => {
    if (definicion.scope === "entidad") {
      setSedeId("");
      setAmbienteId("");
      setAmbientes([]);
    }
  }, [definicion.scope, reporteId]);

  async function cargarVistaPrevia() {
    if (!entidadId) {
      setError("Seleccione una entidad.");
      return;
    }
    if (definicion.scope === "ambiente" && !ambienteId) {
      setError("Seleccione sede y ambiente para este reporte.");
      return;
    }

    setLoading(true);
    setError(null);
    const result = await cargarActivosReporte({
      reporteId,
      entidadId,
      ...(definicion.scope === "ambiente" && {
        sedeId: sedeId || undefined,
        ambienteId: ambienteId || undefined,
      }),
    });
    setLoading(false);

    if (result.error) {
      setError(result.error);
      setActivos([]);
      return;
    }
    setActivos(result.data ?? []);
    if ((result.data?.length ?? 0) === 0) {
      setError("No hay registros para los filtros seleccionados.");
    }
  }

  async function resolverActivos(): Promise<ActivoReporte[] | null> {
    if (!entidadId) {
      setError("Seleccione una entidad.");
      return null;
    }
    if (definicion.scope === "ambiente" && !ambienteId) {
      setError("Seleccione sede y ambiente para este reporte.");
      return null;
    }

    setLoading(true);
    setError(null);
    const result = await cargarActivosReporte({
      reporteId,
      entidadId,
      ...(definicion.scope === "ambiente" && {
        sedeId: sedeId || undefined,
        ambienteId: ambienteId || undefined,
      }),
    });
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return null;
    }
    const data = result.data ?? [];
    setActivos(data);
    if (data.length === 0) {
      setError("No hay registros para los filtros seleccionados.");
      return null;
    }
    return data;
  }

  async function handleExport(formato: ReporteFormato) {
    if (!entidad) return;
    const data = await resolverActivos();
    if (!data) return;

    setPending(formato);
    setError(null);
    try {
      await exportReporte(formato, data, {
        reporteId,
        entidadNombre: entidad.nombre,
        ambienteNombre: ambiente?.nombre ?? null,
        sedeNombre: sede?.nombre ?? null,
        responsable: ambiente?.responsable ?? null,
        usuarioNombre,
        usuarioEmail,
        fechaGeneracion: new Date(),
        fechaCorte,
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No se pudo generar el reporte.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className={`${panelCardClass} space-y-4 p-4 sm:p-6`}>
        <div className="space-y-2">
          <label htmlFor="reporte_tipo" className="text-sm font-medium">
            Tipo de reporte
          </label>
          <select
            id="reporte_tipo"
            className={selectClass}
            value={reporteId}
            onChange={(e) => setReporteId(e.target.value as ReporteId)}
          >
            {reportesDisponibles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">{definicion.descripcion}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <label htmlFor="reporte_entidad" className="text-xs font-medium text-muted-foreground">
              Entidad
            </label>
            <select
              id="reporte_entidad"
              className={selectClass}
              value={entidadId}
              disabled={esAdmin && entidades.length <= 1}
              onChange={(e) => {
                setEntidadId(e.target.value);
                setSedeId("");
                setAmbienteId("");
              }}
            >
              <option value="">Seleccione…</option>
              {entidades.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>

          {definicion.scope === "ambiente" && (
            <>
              <div className="space-y-1">
                <label htmlFor="reporte_sede" className="text-xs font-medium text-muted-foreground">
                  Sede
                </label>
                <select
                  id="reporte_sede"
                  className={selectClass}
                  value={sedeId}
                  disabled={!entidadId}
                  onChange={(e) => {
                    setSedeId(e.target.value);
                    setAmbienteId("");
                  }}
                >
                  <option value="">Seleccione…</option>
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="reporte_ambiente"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Ambiente
                </label>
                <select
                  id="reporte_ambiente"
                  className={selectClass}
                  value={ambienteId}
                  disabled={!sedeId}
                  onChange={(e) => setAmbienteId(e.target.value)}
                >
                  <option value="">Seleccione…</option>
                  {ambientes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label htmlFor="reporte_corte" className="text-xs font-medium text-muted-foreground">
              Fecha de corte
            </label>
            <input
              id="reporte_corte"
              type="date"
              className={selectClass}
              value={fechaCorte}
              onChange={(e) => setFechaCorte(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={loading} onClick={() => void cargarVistaPrevia()}>
            {loading ? "Cargando…" : "Vista previa de datos"}
          </Button>
          {definicion.formatos.includes("excel") && (
            <Button
              type="button"
              variant="outline"
              disabled={pending !== null || !entidadId}
              onClick={() => void handleExport("excel")}
            >
              {pending === "excel" ? "Generando…" : "Descargar Excel"}
            </Button>
          )}
          {definicion.formatos.includes("pdf") && (
            <Button
              type="button"
              disabled={pending !== null || !entidadId}
              onClick={() => void handleExport("pdf")}
            >
              {pending === "pdf" ? "Generando…" : "Descargar PDF"}
            </Button>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {activos.length > 0 && !error && (
          <p className="text-sm text-primary">
            {activos.length} registro{activos.length === 1 ? "" : "s"} listo
            {activos.length === 1 ? "" : "s"} para exportar.
          </p>
        )}
      </div>

      <div className={`${panelCardClass} p-4 text-sm text-muted-foreground`}>
        <p className="font-medium text-foreground">Formato institucional B&amp;D</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Membrete con razón social, RUC y fecha de corte</li>
          <li>Usuario generador y numeración de páginas en PDF</li>
          {esAdmin ? (
            <li>Solo reportes físicos sin columnas monetarias (valores reservados al contador)</li>
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
