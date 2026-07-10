"use client";

import { useEffect, useState } from "react";
import type { Entidad } from "@inventario/types";
import { Button } from "@inventario/ui";
import { EntidadResumenPanel } from "@inventario/ui/panel";
import type { ActivoConUbicacion } from "../lib/activos";
import {
  listAmbientesPorEntidad,
  listSedesConConteo,
  type AmbienteConSede,
} from "../lib/ubicacion";
import type { SedeConConteo } from "@inventario/types";

interface EntidadResumenViewProps {
  entidad: Entidad;
  activos: ActivoConUbicacion[];
  activosLoading?: boolean;
  onGestionarEntidad: () => void;
  onVolver: () => void;
  volverLabel?: string;
}

export function EntidadResumenView({
  entidad,
  activos,
  activosLoading = false,
  onGestionarEntidad,
  onVolver,
  volverLabel = "← Entidades",
}: EntidadResumenViewProps) {
  const [ambientes, setAmbientes] = useState<AmbienteConSede[]>([]);
  const [sedes, setSedes] = useState<SedeConConteo[]>([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setMetaLoading(true);
    setError(null);

    void (async () => {
      try {
        const [listaAmbientes, listaSedes] = await Promise.all([
          listAmbientesPorEntidad(entidad.id),
          listSedesConConteo(entidad.id),
        ]);
        if (!cancelled) {
          setAmbientes(listaAmbientes);
          setSedes(listaSedes);
        }
      } catch {
        if (!cancelled) {
          setError("No se pudieron cargar los ambientes de la entidad.");
        }
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [entidad.id]);

  const loading = activosLoading || metaLoading;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onVolver}>
          {volverLabel}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onGestionarEntidad}>
          Gestionar entidad
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando resumen…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <EntidadResumenPanel
          entidadNombre={entidad.nombre}
          entidadRuc={entidad.ruc}
          activos={activos}
          ambientes={ambientes.map((a) => ({
            id: a.id,
            nombre: a.nombre,
            descripcion: a.descripcion,
            responsable: a.responsable,
            sede_id: a.sede_id,
            sede_nombre: a.sede_nombre,
            sede_es_principal: a.sede_es_principal,
            activo_count: a.activo_count,
            activo: a.activo,
          }))}
          sedes={sedes.map((s) => ({
            id: s.id,
            nombre: s.nombre,
            es_principal: s.es_principal,
          }))}
        />
      )}
    </div>
  );
}
