import { codigoBarrasLookupVariants } from "@inventario/types";
import type { Activo, CategoriaBien, EstadoBien, EstadoRegistro } from "@inventario/types";
import { fetchProfile } from "./profile";
import { getSupabaseClient } from "./supabase";

export type ActivoConUbicacion = Activo & {
  entidad_nombre?: string;
  sede_nombre?: string;
  ambiente_nombre?: string;
};

export interface CreateActivoInput {
  entidad_id: string;
  codigo_catalogo: string;
  nombre: string;
  nombre_etiqueta?: string | null;
  descripcion?: string;
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
}

export type UpdateActivoInput = Omit<CreateActivoInput, "entidad_id">;

function mapActivoRow(row: Record<string, unknown>): ActivoConUbicacion {
  const entidades = row.entidades as { nombre: string } | null;
  const sedes = row.sedes as { nombre: string } | null;
  const ambientes = row.ambientes as { nombre: string } | null;
  const { entidades: _e, sedes: _s, ambientes: _a, ...activo } = row;
  return {
    ...(activo as unknown as Activo),
    entidad_nombre: entidades?.nombre,
    sede_nombre: sedes?.nombre,
    ambiente_nombre: ambientes?.nombre,
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
        .select("*, sedes:sede_id(nombre), ambientes:ambiente_id(nombre)")
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
    .select("*, sedes:sede_id(nombre), ambientes:ambiente_id(nombre)")
    .eq("entidad_id", entidadId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return mapActivoRows(data as Record<string, unknown>[]);
}

export async function listActivosPorAmbiente(ambienteId: string): Promise<ActivoConUbicacion[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("activos")
    .select("*, sedes:sede_id(nombre), ambientes:ambiente_id(nombre)")
    .eq("ambiente_id", ambienteId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return mapActivoRows(data as Record<string, unknown>[]);
}

export async function listActivosGlobal(): Promise<ActivoConUbicacion[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("activos")
    .select("*, entidades(nombre), sedes:sede_id(nombre), ambientes:ambiente_id(nombre)")
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
    .select("*, sedes:sede_id(nombre), ambientes:ambiente_id(nombre)")
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

  let responsable: string | null = null;
  if (input.ambiente_id) {
    const { data: ambiente } = await supabase
      .from("ambientes")
      .select("responsable")
      .eq("id", input.ambiente_id)
      .maybeSingle();
    responsable = ambiente?.responsable?.trim() || null;
  }

  const payload = {
    entidad_id: input.entidad_id,
    codigo_catalogo: input.codigo_catalogo.trim(),
    nombre: input.nombre.trim(),
    nombre_etiqueta: input.nombre_etiqueta?.trim() || null,
    descripcion: input.descripcion?.trim() || null,
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
    sede_id: input.sede_id || null,
    ambiente_id: input.ambiente_id || null,
  };

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
    .select("ambiente_id")
    .eq("id", activoId)
    .maybeSingle();

  const ambienteId = input.ambiente_id ?? existing?.ambiente_id;
  let responsable: string | null = null;
  if (ambienteId) {
    const { data: ambiente } = await supabase
      .from("ambientes")
      .select("responsable")
      .eq("id", ambienteId)
      .maybeSingle();
    responsable = ambiente?.responsable?.trim() || null;
  }

  const payload = {
    codigo_catalogo: input.codigo_catalogo.trim(),
    nombre: input.nombre.trim(),
    nombre_etiqueta: input.nombre_etiqueta?.trim() || null,
    descripcion: input.descripcion?.trim() || null,
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
    sede_id: input.sede_id || null,
    ambiente_id: ambienteId,
  };

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

export async function registrarActivo(
  activoId: string,
): Promise<{ data?: ActivoConUbicacion; error?: string }> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("activos")
    .update({ estado_registro: "REGISTRADO" })
    .eq("id", activoId)
    .eq("estado_registro", "PREREGISTRADO");

  if (error) return { error: error.message };

  const activo = await getActivoById(activoId);
  if (!activo) return { error: "Activo no encontrado tras validar." };
  return { data: activo };
}
