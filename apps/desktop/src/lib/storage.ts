import { getSupabaseClient } from "./supabase";

export async function uploadActivoFile(
  entidadId: string,
  activoId: string,
  file: File,
  kind: "foto" | "comprobante",
): Promise<{ path?: string; error?: string }> {
  const bucket = kind === "foto" ? "fotos-activos" : "comprobantes-activos";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${entidadId}/${activoId}/${kind}.${ext}`;

  const supabase = getSupabaseClient();
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  if (error) return { error: error.message };
  return { path };
}

export async function updateActivoPaths(
  activoId: string,
  paths: {
    foto_path?: string | null;
    comprobante_path?: string | null;
    comprobante_serie?: string | null;
  },
): Promise<{ error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("activos").update(paths).eq("id", activoId);
  if (error) return { error: error.message };
  return {};
}

export async function removeActivoStoragePaths(
  fotoPaths: string[],
  comprobantePaths: string[],
): Promise<void> {
  const supabase = getSupabaseClient();
  if (fotoPaths.length > 0) {
    await supabase.storage.from("fotos-activos").remove(fotoPaths);
  }
  if (comprobantePaths.length > 0) {
    await supabase.storage.from("comprobantes-activos").remove(comprobantePaths);
  }
}
