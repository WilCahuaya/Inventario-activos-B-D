import {
  buildUbicacionLookup,
  validateImportActivoFila,
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

async function loadCatalogoCodigos(codigos: string[]): Promise<Set<string>> {
  const supabase = getSupabaseClient();
  const unique = [...new Set(codigos)];
  if (unique.length === 0) return new Set();

  const found = new Set<string>();
  const chunkSize = 100;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const { data } = await supabase.from("catalogo_nacional").select("codigo").in("codigo", chunk);
    for (const row of data ?? []) {
      found.add(row.codigo as string);
    }
  }
  return found;
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
  const catalogoCodigos = await loadCatalogoCodigos(codigos);

  const errores: ImportActivoErrorItem[] = [];
  let importados = 0;

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i]!;
    const filaExcel = i + 2;
    const validated = validateImportActivoFila(fila, entidadId, ubicacionLookup, catalogoCodigos);
    if (!validated.ok) {
      errores.push({ fila: filaExcel, datos: fila, motivo: validated.motivo });
      continue;
    }

    const payload = validated.payload;
    const responsable = responsableByAmbiente.get(payload.ambiente_id) ?? null;

    const { error } = await supabase.from("activos").insert({
      entidad_id: payload.entidad_id,
      codigo_catalogo: payload.codigo_catalogo,
      nombre: payload.nombre,
      descripcion: payload.descripcion,
      categoria: payload.categoria,
      estado_bien: payload.estado_bien,
      marca: payload.marca,
      modelo: payload.modelo,
      serie: payload.serie,
      color: payload.color,
      medidas: payload.medidas,
      fecha_adquisicion: payload.fecha_adquisicion,
      valor_adquisicion: payload.valor_adquisicion,
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
