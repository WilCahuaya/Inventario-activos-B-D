"use client";

import { useEffect, useMemo, useState } from "react";
import type { Ambiente, Entidad, Sede } from "@inventario/types";
import { ReportesPanelContent } from "@inventario/ui/panel";
import { cargarActivosReporte } from "@/lib/actions/reportes";
import { resolveFichaAsignacionExportMeta } from "@/lib/actions/ficha-asignacion-meta";
import { listAmbientes, listSedes } from "@/lib/actions/ubicacion";
import {
  REPORTE_PREVIEW_MAX_ROWS,
  buildReporteResumenPreview,
  buildReporteRows,
  exportReporte,
  reporteHeaders,
  reportesDisponiblesParaRol,
  type ActivoReporte,
  type ReporteFormato,
  type ReporteId,
} from "@/lib/reportes";

interface ReportesPanelProps {
  entidades: Entidad[];
  usuarioNombre: string;
  usuarioEmail: string;
  esAdmin?: boolean;
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ReportesPanel({
  entidades,
  usuarioNombre,
  usuarioEmail,
  esAdmin = false,
}: ReportesPanelProps) {
  const reportesDisponibles = useMemo(
    () => reportesDisponiblesParaRol(esAdmin ? "ADMIN_ENTIDAD" : "CONTADOR"),
    [esAdmin],
  );

  const [reporteId, setReporteId] = useState<ReporteId>(reportesDisponibles[0]!.id);
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

  useEffect(() => {
    if (!reportesDisponibles.some((r) => r.id === reporteId) && reportesDisponibles[0]) {
      setReporteId(reportesDisponibles[0].id);
    }
  }, [reportesDisponibles, reporteId]);

  const definicion = reportesDisponibles.find((r) => r.id === reporteId) ?? reportesDisponibles[0]!;
  const entidad = entidades.find((e) => e.id === entidadId);
  const ambiente = ambientes.find((a) => a.id === ambienteId);
  const sede = sedes.find((s) => s.id === sedeId);
  const hideEntidadSelector = esAdmin && entidades.length <= 1;

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

  useEffect(() => {
    setActivos([]);
    setError(null);
  }, [reporteId, entidadId, sedeId, ambienteId, fechaCorte]);

  const preview = useMemo(() => {
    if (activos.length === 0) return null;
    const fecha = new Date(fechaCorte);
    const headers = reporteHeaders(reporteId, definicion.valorizado);
    const rows = buildReporteRows(activos, reporteId, definicion.valorizado, fecha);
    return {
      headers,
      rows: rows.slice(0, REPORTE_PREVIEW_MAX_ROWS),
      total: activos.length,
      resumen: buildReporteResumenPreview(activos, reporteId, fechaCorte),
    };
  }, [activos, reporteId, definicion.valorizado, fechaCorte]);

  async function cargarActivos(): Promise<ActivoReporte[] | null> {
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
      setActivos([]);
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

  async function handlePreview() {
    await cargarActivos();
  }

  async function handleExport(formato: ReporteFormato) {
    if (!entidad) return;
    const data = await cargarActivos();
    if (!data) return;

    setPending(formato);
    setError(null);
    try {
      const fichaMeta =
        definicion.scope === "ambiente" && ambiente
          ? await resolveFichaAsignacionExportMeta(entidad, ambiente, sede?.nombre ?? null)
          : null;

      await exportReporte(formato, data, {
        reporteId,
        entidadNombre: entidad.nombre,
        ambienteNombre: ambiente?.nombre ?? null,
        sedeNombre: sede?.nombre ?? fichaMeta?.sedeNombre ?? null,
        responsable: fichaMeta?.responsable ?? ambiente?.responsable ?? null,
        responsableDni: fichaMeta?.responsableDni ?? null,
        adminNombre: fichaMeta?.adminNombre ?? entidad.admin_nombre ?? null,
        adminDni: fichaMeta?.adminDni ?? null,
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
    <ReportesPanelContent
      reportes={reportesDisponibles}
      reporteId={reporteId}
      onReporteIdChange={(id) => setReporteId(id as ReporteId)}
      entidades={entidades}
      entidadId={entidadId}
      onEntidadChange={(value) => {
        setEntidadId(value);
        setSedeId("");
        setAmbienteId("");
      }}
      hideEntidadSelector={hideEntidadSelector}
      entidadNombreFija={entidad?.nombre}
      sedes={sedes}
      sedeId={sedeId}
      onSedeChange={(value) => {
        setSedeId(value);
        setAmbienteId("");
      }}
      ambientes={ambientes}
      ambienteId={ambienteId}
      onAmbienteChange={setAmbienteId}
      fechaCorte={fechaCorte}
      onFechaCorteChange={setFechaCorte}
      loading={loading}
      pending={pending}
      error={error}
      onPreview={() => void handlePreview()}
      onExport={(formato) => void handleExport(formato)}
      previewHeaders={preview?.headers ?? []}
      previewRows={preview?.rows ?? []}
      previewTotal={preview?.total ?? 0}
      resumen={preview?.resumen ?? null}
      esAdmin={esAdmin}
    />
  );
}
