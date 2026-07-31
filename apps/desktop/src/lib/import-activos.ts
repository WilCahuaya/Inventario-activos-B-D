import {
  buildUbicacionLookup,
  normalizeImportCodigoCatalogoRaw,
  toImportProgress,
  validateImportActivoFila,
  type ImportActivoCatalogoItem,
  type ImportActivoErrorItem,
  type ImportActivoFila,
  type ImportActivosResult,
  type ImportActivoInsertPayload,
  type ImportProgress,
  type ImportUbicacionRef,
} from "@inventario/types";
import type { Activo } from "@inventario/types";
import {
  type ActivoConUbicacion,
  type CreateActivoInput,
} from "./activos";
import { getCatalogoByCodigo, upsertCuentaContable } from "./catalogo";
import { isOnline, listMasterDomain } from "./master-cache";
import { enqueueOfflineCreate, upsertCachedActivo } from "./offline";
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
  const unique = [...new Set(codigos)];
  const map = new Map<string, ImportActivoCatalogoItem>();
  if (unique.length === 0) return map;

  if (!isOnline()) {
    await Promise.all(
      unique.map(async (codigo) => {
        const row = await getCatalogoByCodigo(codigo);
        if (!row) return;
        map.set(codigo, {
          denominacion: String(row.denominacion ?? ""),
          cuenta_codigo: (row.cuenta_codigo as string | null) ?? null,
          contabilidad: (row.contabilidad as string | null) ?? null,
          depreciacion: (row.depreciacion as string | null) ?? null,
        });
      }),
    );
    return map;
  }

  const supabase = getSupabaseClient();
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

async function loadCuentasContablesLookup(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!isOnline()) {
    return map;
  }

  const supabase = getSupabaseClient();
  const { data } = await supabase.from("cuentas_contables").select("codigo, nombre");
  for (const row of data ?? []) {
    const codigo = String(row.codigo ?? "").trim();
    if (!codigo) continue;
    map.set(codigo, String(row.nombre ?? "").trim() || codigo);
  }
  return map;
}

function collectImportCatalogoCodigos(filas: ImportActivoFila[]): string[] {
  const codes = new Set<string>();
  for (const fila of filas) {
    for (const code of normalizeImportCodigoCatalogoRaw(fila["Código catálogo"])) {
      codes.add(code);
    }
  }
  return [...codes];
}

function buildCreateActivoInput(payload: ImportActivoInsertPayload): CreateActivoInput {
  return {
    entidad_id: payload.entidad_id,
    codigo_catalogo: payload.codigo_catalogo,
    nombre: payload.nombre,
    caracteristicas: payload.caracteristicas ?? undefined,
    categoria: payload.categoria,
    estado_bien: payload.estado_bien,
    marca: payload.marca ?? undefined,
    modelo: payload.modelo ?? undefined,
    serie: payload.serie ?? undefined,
    color: payload.color ?? undefined,
    medidas: payload.medidas ?? undefined,
    fecha_adquisicion: payload.fecha_adquisicion ?? undefined,
    fecha_inicio_depreciacion: payload.fecha_inicio_depreciacion ?? undefined,
    valor_adquisicion: payload.valor_adquisicion ?? undefined,
    valor_es_mercado: payload.valor_es_mercado,
    depreciacion: payload.depreciacion ?? undefined,
    vida_util_meses: payload.vida_util_meses ?? undefined,
    observacion: payload.observacion ?? undefined,
    cuenta_contable_codigo: payload.cuenta_contable_codigo,
    cuenta_contable_nombre: payload.cuenta_contable_nombre,
    sede_id: payload.sede_id,
    ambiente_id: payload.ambiente_id,
    estado_registro: "REGISTRADO",
  };
}

function buildLocalActivoFromImport(
  payload: ImportActivoInsertPayload,
  responsable: string | null,
  ubicaciones: ImportUbicacionRef[],
): ActivoConUbicacion {
  const ubicacion = ubicaciones.find((u) => u.ambienteId === payload.ambiente_id);
  const now = new Date().toISOString();
  const base: Activo = {
    id: `pending-${crypto.randomUUID()}`,
    entidad_id: payload.entidad_id,
    sede_id: payload.sede_id,
    ambiente_id: payload.ambiente_id,
    codigo_catalogo: payload.codigo_catalogo,
    correlativo: null,
    codigo_barras: null,
    nombre: payload.nombre,
    nombre_etiqueta: null,
    descripcion: null,
    caracteristicas: payload.caracteristicas,
    categoria: payload.categoria,
    estado_bien: payload.estado_bien,
    marca: payload.marca,
    modelo: payload.modelo,
    serie: payload.serie,
    color: payload.color,
    medidas: payload.medidas,
    medida_largo: null,
    medida_ancho: null,
    medida_altura: null,
    depreciacion: payload.depreciacion,
    observacion: payload.observacion,
    responsable,
    valor_es_mercado: payload.valor_es_mercado,
    estado_registro: "REGISTRADO",
    valor_adquisicion: payload.valor_adquisicion,
    fecha_adquisicion: payload.fecha_adquisicion,
    fecha_inicio_depreciacion: payload.fecha_inicio_depreciacion,
    vida_util_meses: payload.vida_util_meses,
    foto_path: null,
    comprobante_path: null,
    comprobante_serie: null,
    cuenta_contable_codigo: payload.cuenta_contable_codigo,
    cuenta_contable_nombre: payload.cuenta_contable_nombre,
    posible_ambiente_id: null,
    motivo_baja: null,
    created_by: "",
    updated_by: null,
    created_at: now,
    updated_at: now,
  };

  return {
    ...base,
    sede_nombre: ubicacion?.sedeNombre,
    ambiente_nombre: ubicacion?.ambienteNombre,
    cuenta_codigo: payload.cuenta_contable_codigo,
    contabilidad: payload.cuenta_contable_nombre,
  };
}

async function insertActivoImportOffline(
  entidadId: string,
  payload: ImportActivoInsertPayload,
  responsable: string | null,
  ubicaciones: ImportUbicacionRef[],
): Promise<{ error?: string }> {
  const input = buildCreateActivoInput(payload);
  const localActivo = buildLocalActivoFromImport(payload, responsable, ubicaciones);
  await enqueueOfflineCreate(entidadId, {
    input: input as unknown as Record<string, unknown>,
    localActivo,
  });
  await upsertCachedActivo(entidadId, localActivo);
  return {};
}

export async function importActivos(
  entidadId: string,
  filas: ImportActivoFila[],
  options?: {
    filaOffset?: number;
    onProgress?: (progress: ImportProgress) => void;
  },
): Promise<{ data?: ImportActivosResult; error?: string }> {
  const profile = await fetchProfile();
  if (!profile || profile.rol !== "CONTADOR") {
    return { error: "Solo el contador puede importar activos." };
  }
  if (!entidadId) return { error: "Seleccione una entidad." };
  if (filas.length === 0) return { error: "No hay filas para importar." };

  if (!isOnline()) {
    const entidades = await listMasterDomain<{ id: string; activo: boolean }>("entidades", "");
    if (!entidades.some((e) => e.id === entidadId && e.activo)) {
      return { error: "Entidad no encontrada." };
    }
  } else {
    const supabase = getSupabaseClient();
    const { data: entidad } = await supabase
      .from("entidades")
      .select("id")
      .eq("id", entidadId)
      .eq("activo", true)
      .maybeSingle();
    if (!entidad) return { error: "Entidad no encontrada." };
  }

  const ubicaciones = await getImportActivosUbicaciones(entidadId);
  const ubicacionLookup = buildUbicacionLookup(ubicaciones);
  const responsableByAmbiente = new Map(
    ubicaciones.map((u) => [u.ambienteId, u.responsable?.trim() || null] as const),
  );
  const codigos = collectImportCatalogoCodigos(filas);
  const [catalogoByCodigo, cuentaLookupSeed] = await Promise.all([
    loadCatalogoForImport(codigos),
    loadCuentasContablesLookup(),
  ]);

  const errores: ImportActivoErrorItem[] = [];
  let importados = 0;
  let cuentaLookup = cuentaLookupSeed;
  const filaOffset = options?.filaOffset ?? 0;
  const onProgress = options?.onProgress;
  onProgress?.(toImportProgress(0, filas.length));

  for (let i = 0; i < filas.length; i++) {
    try {
    const fila = filas[i]!;
    const filaExcel = filaOffset + i + 2;
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
    if (validated.cuentaToCreate) {
      const created = await upsertCuentaContable(validated.cuentaToCreate);
      if (created.error) {
        errores.push({ fila: filaExcel, datos: fila, motivo: created.error });
        continue;
      }
    }

    const payload = validated.payload;
    const responsable = responsableByAmbiente.get(payload.ambiente_id) ?? null;

    if (!isOnline()) {
      const offlineResult = await insertActivoImportOffline(
        entidadId,
        payload,
        responsable,
        ubicaciones,
      );
      if (offlineResult.error) {
        errores.push({ fila: filaExcel, datos: fila, motivo: offlineResult.error });
        continue;
      }
      importados += 1;
      continue;
    }

    const supabase = getSupabaseClient();
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
      fecha_inicio_depreciacion: payload.fecha_inicio_depreciacion,
      valor_adquisicion: payload.valor_adquisicion,
      valor_es_mercado: payload.valor_es_mercado,
      depreciacion: payload.depreciacion,
      vida_util_meses: payload.vida_util_meses,
      observacion: payload.observacion,
      responsable,
      sede_id: payload.sede_id,
      ambiente_id: payload.ambiente_id,
      cuenta_contable_codigo: payload.cuenta_contable_codigo,
      cuenta_contable_nombre: payload.cuenta_contable_nombre,
      estado_registro: "REGISTRADO",
    });

    if (error) {
      errores.push({ fila: filaExcel, datos: fila, motivo: error.message });
      continue;
    }

    importados += 1;
    } finally {
      onProgress?.(toImportProgress(i + 1, filas.length));
    }
  }

  return {
    data: {
      totalFilas: filas.length,
      importados,
      errores,
    },
  };
}
