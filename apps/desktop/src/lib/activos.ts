import {
  MAX_ACTIVOS_SIMILARES_CANTIDAD,
  codigoBarrasLookupVariants,
  type ActivosSimilaresPreview,
  type CreateActivosSimilaresResult,
  type EjemplaresSimilaresResumen,
  type UpdateActivosSimilaresInput,
  type UpdateActivosSimilaresResult,
  type PreviewDeleteActivosPorCodigosResult,
  type DeleteActivosPorCodigosResult,
  MAX_ELIMINAR_ACTIVOS_POR_CODIGOS,
  parseCodigosBarrasInput,
} from "@inventario/types";
import type { Activo, CategoriaBien, EstadoBien, EstadoRegistro } from "@inventario/types";
import { fetchProfile } from "./profile";
import { getSupabaseClient } from "./supabase";
import { removeActivoStoragePaths } from "./storage";

export type ActivoConUbicacion = Activo & {
  entidad_nombre?: string;
  sede_nombre?: string;
  ambiente_nombre?: string;
  posible_ambiente_nombre?: string;
};

const ACTIVO_SELECT_SIN_ENTIDAD =
  "*, sedes:sede_id(nombre), ambientes:ambiente_id(nombre), posible_ambiente:posible_ambiente_id(nombre)";

const ACTIVO_SELECT_GLOBAL =
  "*, entidades(nombre), sedes:sede_id(nombre), ambientes:ambiente_id(nombre), posible_ambiente:posible_ambiente_id(nombre)";

export interface CreateActivoInput {
  entidad_id: string;
  codigo_catalogo: string;
  nombre: string;
  nombre_etiqueta?: string | null;
  descripcion?: string;
  caracteristicas?: string;
  categoria?: CategoriaBien;
  estado_bien?: EstadoBien;
  marca?: string;
  modelo?: string;
  serie?: string;
  color?: string;
  medidas?: string;
  depreciacion?: string;
  observacion?: string;
  valor_adquisicion?: number;
  valor_es_mercado?: boolean;
  fecha_adquisicion?: string;
  vida_util_meses?: number;
  comprobante_serie?: string;
  sede_id?: string;
  ambiente_id?: string;
  posible_ambiente_id?: string | null;
  estado_registro?: EstadoRegistro;
}

export type UpdateActivoInput = Omit<CreateActivoInput, "entidad_id">;

function mapActivoRow(row: Record<string, unknown>): ActivoConUbicacion {
  const entidades = row.entidades as { nombre: string } | null;
  const sedes = row.sedes as { nombre: string } | null;
  const ambientes = row.ambientes as { nombre: string } | null;
  const posibleAmbiente = row.posible_ambiente as { nombre: string } | null;
  const { entidades: _e, sedes: _s, ambientes: _a, posible_ambiente: _p, ...activo } = row;
  return {
    ...(activo as unknown as Activo),
    entidad_nombre: entidades?.nombre,
    sede_nombre: sedes?.nombre,
    ambiente_nombre: ambientes?.nombre,
    posible_ambiente_nombre: posibleAmbiente?.nombre,
  };
}

export async function previewCodigoBarras(
  entidadId: string,
  codigoCatalogo: string,
): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("preview_codigo_barras", {
    p_entidad_id: entidadId,
    p_catalogo: codigoCatalogo.trim(),
  });
  if (error) return null;
  return data as string;
}

export async function findActivoByCodigo(
  codigo: string,
  entidadId: string,
  options?: { allowCache?: boolean },
): Promise<ActivoConUbicacion | null> {
  const variants = codigoBarrasLookupVariants(codigo);
  if (variants.length === 0) return null;

  const online = typeof navigator !== "undefined" ? navigator.onLine : true;

  if (online) {
    try {
      const supabase = getSupabaseClient();
      const orFilter = variants
        .flatMap((variant) => [`codigo_barras.eq.${variant}`, `codigo_catalogo.eq.${variant}`])
        .join(",");

      const { data, error } = await supabase
        .from("activos")
        .select(ACTIVO_SELECT_SIN_ENTIDAD)
        .eq("entidad_id", entidadId)
        .or(orFilter)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (data) {
        const mapped = mapActivoRow(data as Record<string, unknown>);
        const { upsertCachedActivo } = await import("./offline");
        await upsertCachedActivo(entidadId, mapped);
        return mapped;
      }
    } catch {
      /* intentar caché local */
    }
  }

  if (options?.allowCache !== false && window.electronAPI?.offlineCacheFind) {
    const { findCachedActivo } = await import("./offline");
    for (const variant of variants) {
      const cached = await findCachedActivo(entidadId, variant);
      if (cached) return cached;
    }
    return null;
  }

  return null;
}

export async function listActivosForEntidad(entidadId: string): Promise<ActivoConUbicacion[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("activos")
    .select(ACTIVO_SELECT_SIN_ENTIDAD)
    .eq("entidad_id", entidadId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return mapActivoRows(data as Record<string, unknown>[]);
}

export async function listActivosPorAmbiente(ambienteId: string): Promise<ActivoConUbicacion[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("activos")
    .select(ACTIVO_SELECT_SIN_ENTIDAD)
    .eq("ambiente_id", ambienteId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return mapActivoRows(data as Record<string, unknown>[]);
}

export async function listActivosGlobal(): Promise<ActivoConUbicacion[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("activos")
    .select(ACTIVO_SELECT_GLOBAL)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return mapActivoRows(data as Record<string, unknown>[]);
}

function mapActivoRows(data: Record<string, unknown>[] | null): ActivoConUbicacion[] {
  return (data ?? []).map((row) => mapActivoRow(row));
}

export async function getActivoById(activoId: string): Promise<ActivoConUbicacion | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("activos")
    .select(ACTIVO_SELECT_SIN_ENTIDAD)
    .eq("id", activoId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapActivoRow(data as Record<string, unknown>);
}

export async function createActivo(
  input: CreateActivoInput,
): Promise<{ data?: Activo; error?: string }> {
  const supabase = getSupabaseClient();

  const esPreregistro = input.estado_registro !== "REGISTRADO";

  let responsable: string | null = null;
  const ambienteResponsableId = esPreregistro ? input.posible_ambiente_id : input.ambiente_id;
  if (ambienteResponsableId) {
    const { data: ambiente } = await supabase
      .from("ambientes")
      .select("responsable")
      .eq("id", ambienteResponsableId)
      .maybeSingle();
    responsable = ambiente?.responsable?.trim() || null;
  }

  const payload: Record<string, unknown> = {
    entidad_id: input.entidad_id,
    codigo_catalogo: input.codigo_catalogo.trim(),
    nombre: input.nombre.trim(),
    nombre_etiqueta: input.nombre_etiqueta?.trim() || null,
    descripcion: input.descripcion?.trim() || null,
    caracteristicas: input.caracteristicas?.trim() || null,
    categoria: input.categoria ?? "ACTIVO",
    estado_bien: input.estado_bien ?? "BUENO",
    marca: input.marca?.trim() || null,
    modelo: input.modelo?.trim() || null,
    serie: input.serie?.trim() || null,
    color: input.color?.trim() || null,
    medidas: input.medidas?.trim() || null,
    depreciacion: input.depreciacion?.trim() || null,
    observacion: input.observacion?.trim() || null,
    responsable,
    valor_adquisicion: input.valor_adquisicion ?? null,
    valor_es_mercado: input.valor_es_mercado ?? false,
    fecha_adquisicion: input.fecha_adquisicion || null,
    vida_util_meses: input.vida_util_meses ?? null,
    comprobante_serie: input.comprobante_serie?.trim() || null,
  };

  if (esPreregistro) {
    payload.posible_ambiente_id = input.posible_ambiente_id || null;
    payload.estado_registro = "PREREGISTRADO";
  } else {
    payload.estado_registro = "REGISTRADO";
    payload.sede_id = input.sede_id || null;
    payload.ambiente_id = input.ambiente_id || null;
    if (!payload.sede_id || !payload.ambiente_id) {
      return { error: "Seleccione sede y ambiente para registrar el activo." };
    }
  }

  if (!payload.codigo_catalogo || !payload.nombre) {
    return { error: "Código catálogo y nombre son obligatorios." };
  }

  const { data, error } = await supabase.from("activos").insert(payload).select().single();
  if (error) return { error: error.message };
  return { data: data as Activo };
}

export async function updateActivo(
  activoId: string,
  input: UpdateActivoInput,
): Promise<{ data?: Activo; error?: string }> {
  const supabase = getSupabaseClient();

  const { data: existing } = await supabase
    .from("activos")
    .select("ambiente_id, estado_registro, posible_ambiente_id")
    .eq("id", activoId)
    .maybeSingle();

  const esPreregistro = existing?.estado_registro === "PREREGISTRADO";
  const ambienteId = input.ambiente_id ?? existing?.ambiente_id;
  const responsableAmbienteId = esPreregistro
    ? input.posible_ambiente_id ?? existing?.posible_ambiente_id
    : ambienteId;
  let responsable: string | null = null;
  if (responsableAmbienteId) {
    const { data: ambiente } = await supabase
      .from("ambientes")
      .select("responsable")
      .eq("id", responsableAmbienteId)
      .maybeSingle();
    responsable = ambiente?.responsable?.trim() || null;
  }

  const payload: Record<string, unknown> = {
    codigo_catalogo: input.codigo_catalogo.trim(),
    nombre: input.nombre.trim(),
    nombre_etiqueta: input.nombre_etiqueta?.trim() || null,
    descripcion: input.descripcion?.trim() || null,
    caracteristicas: input.caracteristicas?.trim() || null,
    categoria: input.categoria ?? "ACTIVO",
    estado_bien: input.estado_bien ?? "BUENO",
    marca: input.marca?.trim() || null,
    modelo: input.modelo?.trim() || null,
    serie: input.serie?.trim() || null,
    color: input.color?.trim() || null,
    medidas: input.medidas?.trim() || null,
    depreciacion: input.depreciacion?.trim() || null,
    observacion: input.observacion?.trim() || null,
    responsable,
    valor_adquisicion: input.valor_adquisicion ?? null,
    valor_es_mercado: input.valor_es_mercado ?? false,
    fecha_adquisicion: input.fecha_adquisicion || null,
    vida_util_meses: input.vida_util_meses ?? null,
    comprobante_serie: input.comprobante_serie?.trim() || null,
  };

  if (esPreregistro) {
    payload.posible_ambiente_id = input.posible_ambiente_id ?? null;
  } else {
    payload.sede_id = input.sede_id || null;
    payload.ambiente_id = ambienteId;
  }

  if (!payload.codigo_catalogo || !payload.nombre) {
    return { error: "Código catálogo y nombre son obligatorios." };
  }

  const { data, error } = await supabase
    .from("activos")
    .update(payload)
    .eq("id", activoId)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as Activo };
}

export async function cambiarUbicacionActivo(
  activoId: string,
  sedeId: string,
  ambienteId: string,
): Promise<{ data?: ActivoConUbicacion; error?: string }> {
  const profile = await fetchProfile();
  if (!profile) return { error: "Sesión no válida." };
  if (!sedeId || !ambienteId) return { error: "Seleccione sede y ambiente." };

  const supabase = getSupabaseClient();

  const { data: existing, error: fetchError } = await supabase
    .from("activos")
    .select("entidad_id, ambiente_id, estado_registro")
    .eq("id", activoId)
    .maybeSingle();

  if (fetchError || !existing) {
    return { error: fetchError?.message ?? "Activo no encontrado." };
  }

  if (existing.estado_registro === "DADO_DE_BAJA") {
    return { error: "No se puede mover un activo dado de baja." };
  }

  if (profile.rol !== "CONTADOR") {
    return { error: "No autorizado." };
  }

  const { data: sede } = await supabase
    .from("sedes")
    .select("entidad_id")
    .eq("id", sedeId)
    .maybeSingle();

  if (!sede || sede.entidad_id !== existing.entidad_id) {
    return { error: "La sede seleccionada no pertenece a la entidad del activo." };
  }

  const { data: ambiente } = await supabase
    .from("ambientes")
    .select("sede_id, responsable")
    .eq("id", ambienteId)
    .eq("activo", true)
    .maybeSingle();

  if (!ambiente || ambiente.sede_id !== sedeId) {
    return { error: "El ambiente no pertenece a la sede seleccionada." };
  }

  const responsable = ambiente.responsable?.trim() || null;

  const { error } = await supabase
    .from("activos")
    .update({
      sede_id: sedeId,
      ambiente_id: ambienteId,
      responsable,
      updated_by: profile.id,
    })
    .eq("id", activoId);

  if (error) return { error: error.message };

  const activo = await getActivoById(activoId);
  if (!activo) return { error: "Activo no encontrado tras actualizar." };
  return { data: activo };
}

export async function darDeBajaActivo(
  activoId: string,
  motivo: string,
): Promise<{ data?: ActivoConUbicacion; error?: string }> {
  const profile = await fetchProfile();
  if (!profile) return { error: "Sesión no válida." };
  if (profile.rol !== "CONTADOR") {
    return { error: "Solo el contador puede dar de baja activos." };
  }

  const motivoBaja = motivo.trim();
  if (!motivoBaja) return { error: "Indique el motivo de baja." };

  const supabase = getSupabaseClient();

  const { data: existing, error: fetchError } = await supabase
    .from("activos")
    .select("entidad_id, ambiente_id, estado_registro")
    .eq("id", activoId)
    .maybeSingle();

  if (fetchError || !existing) {
    return { error: fetchError?.message ?? "Activo no encontrado." };
  }

  if (existing.estado_registro === "DADO_DE_BAJA") {
    return { error: "El activo ya está inactivo." };
  }

  const { error } = await supabase
    .from("activos")
    .update({
      estado_registro: "DADO_DE_BAJA" as EstadoRegistro,
      motivo_baja: motivoBaja,
      updated_by: profile.id,
    })
    .eq("id", activoId);

  if (error) return { error: error.message };

  const activo = await getActivoById(activoId);
  if (!activo) return { error: "Activo no encontrado tras dar de baja." };
  return { data: activo };
}

export async function recuperarActivo(
  activoId: string,
): Promise<{ data?: ActivoConUbicacion; error?: string }> {
  const profile = await fetchProfile();
  if (!profile) return { error: "Sesión no válida." };
  if (profile.rol !== "CONTADOR") {
    return { error: "Solo el contador puede recuperar activos dados de baja." };
  }

  const supabase = getSupabaseClient();

  const { data: existing, error: fetchError } = await supabase
    .from("activos")
    .select("estado_registro, codigo_barras")
    .eq("id", activoId)
    .maybeSingle();

  if (fetchError || !existing) {
    return { error: fetchError?.message ?? "Activo no encontrado." };
  }

  if (existing.estado_registro !== "DADO_DE_BAJA") {
    return { error: "El activo no está dado de baja." };
  }

  const nuevoEstado: EstadoRegistro = existing.codigo_barras?.trim()
    ? "REGISTRADO"
    : "PREREGISTRADO";

  const { error } = await supabase
    .from("activos")
    .update({
      estado_registro: nuevoEstado,
      motivo_baja: null,
      updated_by: profile.id,
    })
    .eq("id", activoId);

  if (error) return { error: error.message };

  const activo = await getActivoById(activoId);
  if (!activo) return { error: "Activo no encontrado tras recuperar." };
  return { data: activo };
}

export async function registrarActivo(
  activoId: string,
  destino: { sedeId: string; ambienteId: string },
): Promise<{ data?: ActivoConUbicacion; error?: string }> {
  const supabase = getSupabaseClient();

  if (!destino.sedeId || !destino.ambienteId) {
    return { error: "Seleccione sede y ambiente destino." };
  }

  const { data: ambienteDestino } = await supabase
    .from("ambientes")
    .select("id, sede_id, es_preregistro, responsable")
    .eq("id", destino.ambienteId)
    .maybeSingle();

  if (!ambienteDestino || ambienteDestino.sede_id !== destino.sedeId) {
    return { error: "El ambiente no pertenece a la sede seleccionada." };
  }
  if (ambienteDestino.es_preregistro) {
    return { error: "Seleccione un ambiente real, no el de preregistros." };
  }

  const { error } = await supabase
    .from("activos")
    .update({
      estado_registro: "REGISTRADO",
      sede_id: destino.sedeId,
      ambiente_id: destino.ambienteId,
      posible_ambiente_id: null,
      responsable: ambienteDestino.responsable?.trim() || null,
    })
    .eq("id", activoId)
    .eq("estado_registro", "PREREGISTRADO");

  if (error) return { error: error.message };

  const activo = await getActivoById(activoId);
  if (!activo) return { error: "Activo no encontrado tras validar." };
  return { data: activo };
}

export async function previewActivosSimilares(
  entidadId: string,
  codigoCatalogo: string,
  cantidad: number,
): Promise<ActivosSimilaresPreview | null> {
  const qty = Math.floor(cantidad);
  if (qty < 1 || qty > MAX_ACTIVOS_SIMILARES_CANTIDAD) return null;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("preview_activos_similares_rango", {
    p_entidad_id: entidadId,
    p_catalogo: codigoCatalogo.trim(),
    p_cantidad: qty,
  });

  if (error) return null;
  const row = data as {
    es_registrado?: boolean;
    primer_codigo?: string | null;
    ultimo_codigo?: string | null;
  };
  return {
    es_registrado: Boolean(row.es_registrado),
    primer_codigo: row.primer_codigo ?? null,
    ultimo_codigo: row.ultimo_codigo ?? null,
  };
}

export type CreateActivosSimilaresUbicacion = {
  sedeId: string;
  ambienteId: string;
};

export async function createActivosSimilares(
  activoId: string,
  cantidad: number,
  ubicacion?: CreateActivosSimilaresUbicacion,
): Promise<{ data?: CreateActivosSimilaresResult; error?: string }> {
  const qty = Math.floor(cantidad);
  if (qty < 1 || qty > MAX_ACTIVOS_SIMILARES_CANTIDAD) {
    return { error: `La cantidad debe estar entre 1 y ${MAX_ACTIVOS_SIMILARES_CANTIDAD}.` };
  }

  const supabase = getSupabaseClient();

  const { data: existing, error: fetchError } = await supabase
    .from("activos")
    .select("estado_registro")
    .eq("id", activoId)
    .maybeSingle();

  if (fetchError || !existing) {
    return { error: fetchError?.message ?? "Activo no encontrado." };
  }

  if (existing.estado_registro === "DADO_DE_BAJA") {
    return { error: "No puede duplicar un activo dado de baja." };
  }

  const rpcParams: {
    p_activo_id: string;
    p_cantidad: number;
    p_sede_id?: string;
    p_ambiente_id?: string;
  } = {
    p_activo_id: activoId,
    p_cantidad: qty,
  };
  if (ubicacion) {
    rpcParams.p_sede_id = ubicacion.sedeId;
    rpcParams.p_ambiente_id = ubicacion.ambienteId;
  }

  const { data, error } = await supabase.rpc("create_activos_similares", rpcParams);

  if (error) return { error: error.message };
  return { data: data as CreateActivosSimilaresResult };
}

export async function getEjemplaresSimilaresResumen(
  activoId: string,
): Promise<EjemplaresSimilaresResumen | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("resumen_ejemplares_similares", {
    p_activo_id: activoId,
  });

  if (error) return null;
  const row = data as {
    total?: number;
    registrados?: number;
    preregistrados?: number;
  };
  return {
    total: row.total ?? 0,
    registrados: row.registrados ?? 0,
    preregistrados: row.preregistrados ?? 0,
  };
}

function buildActivosSimilaresPatch(
  input: UpdateActivosSimilaresInput,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      patch[key] = value;
    }
  }
  return patch;
}

export async function updateActivosSimilares(
  activoId: string,
  input: UpdateActivosSimilaresInput,
): Promise<{ data?: UpdateActivosSimilaresResult; error?: string }> {
  const profile = await fetchProfile();
  if (!profile) return { error: "Sesión no válida." };
  if (profile.rol !== "CONTADOR") return { error: "No autorizado." };

  const patch = buildActivosSimilaresPatch(input);
  if (Object.keys(patch).length === 0) {
    return { error: "No hay cambios para aplicar." };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("update_activos_similares", {
    p_activo_id: activoId,
    p_patch: patch,
  });

  if (error) return { error: error.message };
  const result = data as { actualizados?: number };
  return { data: { actualizados: result.actualizados ?? 0 } };
}

export async function listActivosSimilaresParaEtiquetas(
  activoId: string,
): Promise<ActivoConUbicacion[]> {
  const supabase = getSupabaseClient();
  const { data: ids, error: idsError } = await supabase.rpc("list_activos_similares_ids", {
    p_activo_id: activoId,
    p_solo_registrados: true,
  });

  if (idsError) throw new Error(idsError.message);
  const activoIds = (ids as string[] | null) ?? [];
  if (activoIds.length === 0) return [];

  const { data, error } = await supabase
    .from("activos")
    .select(ACTIVO_SELECT_GLOBAL)
    .in("id", activoIds)
    .order("correlativo", { ascending: true });

  if (error) throw new Error(error.message);
  return mapActivoRows(data as Record<string, unknown>[]);
}

function mapPreviewDeleteActivos(data: unknown): PreviewDeleteActivosPorCodigosResult {
  const row = data as {
    solicitados?: number;
    encontrados?: PreviewDeleteActivosPorCodigosResult["encontrados"];
    no_encontrados?: string[];
    no_elegibles?: PreviewDeleteActivosPorCodigosResult["no_elegibles"];
  };
  return {
    solicitados: row.solicitados ?? 0,
    encontrados: row.encontrados ?? [],
    no_encontrados: row.no_encontrados ?? [],
    no_elegibles: row.no_elegibles ?? [],
  };
}

export async function previewDeleteActivosPorCodigos(
  entidadId: string,
  codigosText: string,
): Promise<{ data?: PreviewDeleteActivosPorCodigosResult; error?: string }> {
  const profile = await fetchProfile();
  if (!profile) return { error: "Sesión no válida." };
  if (profile.rol !== "CONTADOR") return { error: "Solo el contador puede eliminar activos." };
  if (!entidadId) return { error: "Seleccione la entidad." };

  const codigos = parseCodigosBarrasInput(codigosText);
  if (codigos.length === 0) return { error: "Indique al menos un código de barras." };
  if (codigos.length > MAX_ELIMINAR_ACTIVOS_POR_CODIGOS) {
    return { error: `Máximo ${MAX_ELIMINAR_ACTIVOS_POR_CODIGOS} códigos por operación.` };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("preview_delete_activos_por_codigos", {
    p_entidad_id: entidadId,
    p_codigos: codigos,
  });

  if (error) return { error: error.message };
  return { data: mapPreviewDeleteActivos(data) };
}

export async function deleteActivosPorCodigos(
  entidadId: string,
  codigosText: string,
): Promise<{ data?: DeleteActivosPorCodigosResult; error?: string }> {
  const profile = await fetchProfile();
  if (!profile) return { error: "Sesión no válida." };
  if (profile.rol !== "CONTADOR") return { error: "Solo el contador puede eliminar activos." };
  if (!entidadId) return { error: "Seleccione la entidad." };

  const codigos = parseCodigosBarrasInput(codigosText);
  if (codigos.length === 0) return { error: "Indique al menos un código de barras." };
  if (codigos.length > MAX_ELIMINAR_ACTIVOS_POR_CODIGOS) {
    return { error: `Máximo ${MAX_ELIMINAR_ACTIVOS_POR_CODIGOS} códigos por operación.` };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("delete_activos_por_codigos", {
    p_entidad_id: entidadId,
    p_codigos: codigos,
  });

  if (error) return { error: error.message };

  const result = data as {
    eliminados?: number;
    codigos?: string[];
    foto_paths?: string[];
    comprobante_paths?: string[];
  };

  try {
    await removeActivoStoragePaths(
      (result.foto_paths as string[] | undefined) ?? [],
      (result.comprobante_paths as string[] | undefined) ?? [],
    );
  } catch {
    // La eliminación en BD ya se aplicó.
  }

  return {
    data: {
      eliminados: result.eliminados ?? 0,
      codigos: result.codigos ?? [],
      foto_paths: result.foto_paths ?? [],
      comprobante_paths: result.comprobante_paths ?? [],
    },
  };
}
