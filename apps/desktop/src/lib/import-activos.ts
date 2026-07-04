import {
  buildCuentaContableLookup,
  buildUbicacionLookup,
  validateImportActivoFila,
  type ImportActivoCatalogoItem,
  type ImportActivoErrorItem,
  type ImportActivoFila,
  type ImportActivosResult,
  type ImportUbicacionRef,
} from "@inventario/types";
import { fetchProfile } from "./profile";
import { getSupabaseClient } from "./supabase";
import { listAmbientesPorEntidad } from "./ubicacion";

export async function getImportActivosUbicaciones(entidadId: string): Promise<ImportUbicacionRef[]> {
  const profile = await fetchProfile();
  if (!profile || profile.rol !== "CONTADOR") {
    throw new Error("Solo el contador puede importar activos.");
  }

  const ambientes = await listAmbientesPorEntidad(entidadId);
  return ambientes.map((a) => ({
    sedeId: a.sede_id,
    sedeNombre: a.sede_nombre,
    ambienteId: a.id,
    ambienteNombre: a.nombre,
    responsable: a.responsable,
  }));
}

async function loadCatalogoForImport(codigos: string[]): Promise<Map<string, ImportActivoCatalogoItem>> {
  const supabase = getSupabaseClient();
  const unique = [...new Set(codigos)];
  const map = new Map<string, ImportActivoCatalogoItem>();
  if (unique.length === 0) return map;

  const chunkSize = 100;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const { data } = await supabase
      .from("catalogo_nacional")
      .select("codigo, denominacion, cuenta_codigo, contabilidad, depreciacion")
      .in("codigo", chunk);
    for (const row of data ?? []) {
      map.set(row.codigo as string, {
        denominacion: String(row.denominacion ?? ""),
        cuenta_codigo: (row.cuenta_codigo as string | null) ?? null,
        contabilidad: (row.contabilidad as string | null) ?? null,
        depreciacion: (row.depreciacion as string | null) ?? null,
      });
    }
  }
  return map;
}

async function loadCuentaContableLookup(): Promise<Map<string, string>> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("catalogo_nacional")
    .select("cuenta_codigo, contabilidad")
    .not("cuenta_codigo", "is", null);
  return buildCuentaContableLookup(data ?? []);
}

export async function importActivos(
  entidadId: string,
  filas: ImportActivoFila[],
): Promise<{ data?: ImportActivosResult; error?: string }> {
  const profile = await fetchProfile();
  if (!profile || profile.rol !== "CONTADOR") {
    return { error: "Solo el contador puede importar activos." };
  }
  if (!entidadId) return { error: "Seleccione una entidad." };
  if (filas.length === 0) return { error: "No hay filas para importar." };

  const supabase = getSupabaseClient();

  const { data: entidad } = await supabase
    .from("entidades")
    .select("id")
    .eq("id", entidadId)
    .eq("activo", true)
    .maybeSingle();
  if (!entidad) return { error: "Entidad no encontrada." };

  const ubicaciones = await getImportActivosUbicaciones(entidadId);
  const ubicacionLookup = buildUbicacionLookup(ubicaciones);
  const responsableByAmbiente = new Map(
    ubicaciones.map((u) => [u.ambienteId, u.responsable?.trim() || null] as const),
  );
  const codigos = filas.map((f) => f["Código catálogo"].replace(/\D/g, "").padStart(8, "0").slice(-8));
  const [catalogoByCodigo, cuentaLookupSeed] = await Promise.all([
    loadCatalogoForImport(codigos),
    loadCuentaContableLookup(),
  ]);

  const errores: ImportActivoErrorItem[] = [];
  let importados = 0;
  let cuentaLookup = cuentaLookupSeed;

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i]!;
    const filaExcel = i + 2;
    const validated = validateImportActivoFila(
      fila,
      entidadId,
      ubicacionLookup,
      catalogoByCodigo,
      cuentaLookup,
    );
    if (!validated.ok) {
      errores.push({ fila: filaExcel, datos: fila, motivo: validated.motivo });
      continue;
    }

    cuentaLookup = validated.cuentaLookup;
    const payload = validated.payload;
    const responsable = responsableByAmbiente.get(payload.ambiente_id) ?? null;

    if (payload.catalogo_contabilidad) {
      const cuentaUpdate = payload.catalogo_contabilidad;
      const { error: cuentaError } = await supabase.rpc("update_catalogo_nacional_contabilidad", {
        p_codigo: cuentaUpdate.codigo_catalogo,
        p_cuenta_codigo: cuentaUpdate.cuenta_codigo,
        p_contabilidad: cuentaUpdate.contabilidad,
        p_depreciacion: cuentaUpdate.depreciacion,
      });
      if (cuentaError) {
        errores.push({ fila: filaExcel, datos: fila, motivo: cuentaError.message });
        continue;
      }
      const existing = catalogoByCodigo.get(cuentaUpdate.codigo_catalogo);
      if (existing) {
        catalogoByCodigo.set(cuentaUpdate.codigo_catalogo, {
          ...existing,
          cuenta_codigo: cuentaUpdate.cuenta_codigo,
          contabilidad: cuentaUpdate.contabilidad,
        });
      }
    }

    const { error } = await supabase.from("activos").insert({
      entidad_id: payload.entidad_id,
      codigo_catalogo: payload.codigo_catalogo,
      nombre: payload.nombre,
      caracteristicas: payload.caracteristicas,
      categoria: payload.categoria,
      estado_bien: payload.estado_bien,
      marca: payload.marca,
      modelo: payload.modelo,
      serie: payload.serie,
      color: payload.color,
      medidas: payload.medidas,
      fecha_adquisicion: payload.fecha_adquisicion,
      valor_adquisicion: payload.valor_adquisicion,
      valor_es_mercado: payload.valor_es_mercado,
      depreciacion: payload.depreciacion,
      vida_util_meses: payload.vida_util_meses,
      observacion: payload.observacion,
      responsable,
      sede_id: payload.sede_id,
      ambiente_id: payload.ambiente_id,
    });

    if (error) {
      errores.push({ fila: filaExcel, datos: fila, motivo: error.message });
      continue;
    }

    importados += 1;
  }

  return {
    data: {
      totalFilas: filas.length,
      importados,
      errores,
    },
  };
}
