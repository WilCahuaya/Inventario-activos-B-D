"use server";

import { revalidatePath } from "next/cache";
import type { CategoriaBien, EstadoBien, EstadoRegistro } from "@inventario/types";
import { createClient } from "@/lib/supabase/server";
import { getProfile, requireProfile } from "@/lib/auth/profile";

export interface CreateActivoInput {
  entidad_id: string;
  codigo_catalogo: string;
  nombre: string;
  descripcion?: string;
  caracteristicas?: string;
  categoria?: CategoriaBien;
  estado_bien?: EstadoBien;
  marca?: string;
  modelo?: string;
  serie?: string;
  color?: string;
  medida_largo?: number;
  medida_ancho?: number;
  medida_altura?: number;
  depreciacion?: string;
  observacion?: string;
  responsable?: string;
  valor_adquisicion?: number;
  valor_es_mercado?: boolean;
  fecha_adquisicion?: string;
  vida_util_meses?: number;
  sede_id?: string;
  ambiente_id?: string;
}

export async function previewCodigoBarras(entidadId: string, codigoCatalogo: string) {
  const profile = await getProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("preview_codigo_barras", {
    p_entidad_id: entidadId,
    p_catalogo: codigoCatalogo.trim(),
  });

  if (error) return null;
  return data as string;
}

export async function createActivo(input: CreateActivoInput) {
  const profile = await getProfile();
  if (!profile) return { error: "Sesión no válida." };

  const supabase = await createClient();
  const payload = {
    entidad_id: profile.rol === "ADMIN_ENTIDAD" ? profile.entidad_id! : input.entidad_id,
    codigo_catalogo: input.codigo_catalogo.trim(),
    nombre: input.nombre.trim(),
    descripcion: input.descripcion?.trim() || null,
    caracteristicas: input.caracteristicas?.trim() || null,
    categoria: input.categoria ?? "ACTIVO",
    estado_bien: input.estado_bien ?? "BUENO",
    marca: input.marca?.trim() || null,
    modelo: input.modelo?.trim() || null,
    serie: input.serie?.trim() || null,
    color: input.color?.trim() || null,
    medida_largo: input.medida_largo ?? null,
    medida_ancho: input.medida_ancho ?? null,
    medida_altura: input.medida_altura ?? null,
    depreciacion: input.depreciacion?.trim() || null,
    observacion: input.observacion?.trim() || null,
    responsable: input.responsable?.trim() || null,
    valor_adquisicion: input.valor_adquisicion ?? null,
    valor_es_mercado: input.valor_es_mercado ?? false,
    fecha_adquisicion: input.fecha_adquisicion || null,
    vida_util_meses: input.vida_util_meses ?? null,
    sede_id: input.sede_id || null,
    ambiente_id: input.ambiente_id || null,
  };

  if (!payload.codigo_catalogo || !payload.nombre) {
    return { error: "Código catálogo y nombre son obligatorios." };
  }

  const { data, error } = await supabase.from("activos").insert(payload).select().single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/contador/inventario");
  revalidatePath("/admin/activos");
  revalidatePath("/admin");
  return { success: true, data };
}

export async function listActivos(entidadId?: string) {
  const profile = await getProfile();
  if (!profile) return [];

  const supabase = await createClient();
  let query = supabase
    .from("activos")
    .select("*, entidades(nombre)")
    .order("created_at", { ascending: false });

  if (profile.rol === "ADMIN_ENTIDAD") {
    query = query.eq("entidad_id", profile.entidad_id!);
  } else if (entidadId) {
    query = query.eq("entidad_id", entidadId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function registrarActivo(activoId: string) {
  await requireProfile("CONTADOR");
  const supabase = await createClient();

  const { error } = await supabase
    .from("activos")
    .update({ estado_registro: "REGISTRADO" as EstadoRegistro })
    .eq("id", activoId)
    .eq("estado_registro", "PREREGISTRADO");

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/contador/inventario");
  revalidatePath("/admin/activos");
  return { success: true };
}

export async function updateActivoPaths(
  activoId: string,
  paths: { foto_path?: string; comprobante_path?: string },
) {
  const supabase = await createClient();
  const { error } = await supabase.from("activos").update(paths).eq("id", activoId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/contador/inventario");
  revalidatePath("/admin/activos");
  return { success: true };
}
