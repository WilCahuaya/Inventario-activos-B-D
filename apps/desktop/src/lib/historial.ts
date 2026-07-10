import {
  collectHistorialLookupIds,
  type HistorialActivoItem,
  type HistorialLookupMaps,
} from "@inventario/types";
import { getSupabaseClient } from "./supabase";

export interface HistorialActivoResult {
  items: HistorialActivoItem[];
  lookups: HistorialLookupMaps;
}

async function buildHistorialLookups(
  items: HistorialActivoItem[],
): Promise<HistorialLookupMaps> {
  const supabase = getSupabaseClient();
  const { sedeIds, ambienteIds } = collectHistorialLookupIds(items);
  const lookups: HistorialLookupMaps = { sedes: {}, ambientes: {} };

  if (sedeIds.length > 0) {
    const { data } = await supabase.from("sedes").select("id, nombre").in("id", sedeIds);
    for (const row of data ?? []) {
      lookups.sedes[row.id] = row.nombre;
    }
  }

  if (ambienteIds.length > 0) {
    const { data } = await supabase.from("ambientes").select("id, nombre").in("id", ambienteIds);
    for (const row of data ?? []) {
      lookups.ambientes[row.id] = row.nombre;
    }
  }

  return lookups;
}

export async function listHistorialActivo(
  activoId: string,
): Promise<{ data?: HistorialActivoResult; error?: string }> {
  if (activoId.startsWith("pending-")) {
    return { data: { items: [], lookups: { sedes: {}, ambientes: {} } } };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("historial_cambios")
    .select("*, profiles(nombre)")
    .eq("activo_id", activoId)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };

  const items: HistorialActivoItem[] = (data ?? []).map((row) => {
    const { profiles, ...rest } = row as HistorialActivoItem & {
      profiles: { nombre: string } | null;
    };
    return {
      ...rest,
      usuario_nombre: profiles?.nombre,
    };
  });

  const lookups = await buildHistorialLookups(items);
  return { data: { items, lookups } };
}
