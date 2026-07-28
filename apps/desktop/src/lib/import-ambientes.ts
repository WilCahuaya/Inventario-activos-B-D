import {
  RESPONSABLE_CARGO_DEFAULT,
  buildExistingAmbienteKeys,
  buildResponsableDniLookup,
  buildResponsableNombreLookup,
  buildSedeLookup,
  findPrincipalSede,
  isPrincipalSedeNombre,
  normalizeImportKey,
  normalizeResponsableDni,
  normalizeResponsableNombre,
  parseImportAmbienteFila,
  toImportProgress,
  validateImportAmbienteDuplicado,
  type ImportAmbienteErrorItem,
  type ImportAmbienteFila,
  type ImportAmbienteRowData,
  type ImportAmbientesContext,
  type ImportAmbientesResult,
  type ImportProgress,
} from "@inventario/types";
import { isOnline, listMasterDomain } from "./master-cache";
import { fetchProfile } from "./profile";
import { createResponsable, listResponsables } from "./responsables";
import { getSupabaseClient } from "./supabase";
import { createAmbiente, createSede, listAmbientesPorEntidad, listSedesConConteo } from "./ubicacion";

export type { ImportAmbientesContext };

export async function getImportAmbientesContext(entidadId: string): Promise<ImportAmbientesContext> {
  const profile = await fetchProfile();
  if (!profile || profile.rol !== "CONTADOR") {
    return { sedes: [], responsables: [], ambientes: [] };
  }

  const [sedes, responsablesResult, ambientes] = await Promise.all([
    listSedesConConteo(entidadId),
    listResponsables(entidadId),
    listAmbientesPorEntidad(entidadId),
  ]);

  const responsables = responsablesResult.data ?? [];

  return {
    sedes: sedes.map((s) => ({
      sedeId: s.id,
      sedeNombre: s.nombre,
      esPrincipal: s.es_principal,
    })),
    responsables: responsables
      .filter((r) => r.activo)
      .map((r) => ({ responsableId: r.id, nombre: r.nombre, dni: r.dni })),
    ambientes: ambientes.map((a) => ({
      sedeNombre: a.sede_nombre,
      ambienteNombre: a.nombre,
    })),
  };
}

async function resolveSedeId(
  entidadId: string,
  data: ImportAmbienteRowData,
  sedeLookup: Map<string, string>,
  principalSedeId: string | null,
  sedesCreadas: { count: number },
): Promise<{ id: string } | { error: string }> {
  const sedeKey = data.sedeNombre.trim();
  const lookupKey = normalizeImportKey(sedeKey);

  if (isPrincipalSedeNombre(sedeKey)) {
    if (!principalSedeId) {
      return { error: 'No existe la sucursal "Principal" en esta entidad.' };
    }
    return { id: principalSedeId };
  }

  const existingId = sedeLookup.get(lookupKey);
  if (existingId) {
    return { id: existingId };
  }

  if (!isOnline()) {
    const result = await createSede(entidadId, sedeKey, data.sedeDireccion ?? undefined);
    if (result.error || !result.data) {
      return { error: result.error ?? "No se pudo crear la sucursal." };
    }
    sedeLookup.set(lookupKey, result.data.id);
    sedesCreadas.count += 1;
    return { id: result.data.id };
  }

  const supabase = getSupabaseClient();
  const { data: sede, error } = await supabase
    .from("sedes")
    .insert({
      entidad_id: entidadId,
      nombre: sedeKey,
      direccion: data.sedeDireccion,
      es_principal: false,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  sedeLookup.set(lookupKey, sede.id as string);
  sedesCreadas.count += 1;
  return { id: sede.id as string };
}

async function resolveResponsableId(
  entidadId: string,
  data: ImportAmbienteRowData,
  responsableByDni: Map<string, string>,
  responsableByNombre: Map<string, string>,
  responsablesCreados: { count: number },
): Promise<{ id: string | null } | { error: string }> {
  if (!data.responsableNombre && !data.responsableDni) {
    return { id: null };
  }

  const dni = normalizeResponsableDni(data.responsableDni ?? "") || null;
  if (dni) {
    const existingByDni = responsableByDni.get(dni);
    if (existingByDni) return { id: existingByDni };
  }

  const nombre = normalizeResponsableNombre(data.responsableNombre!);
  const nombreKey = normalizeImportKey(nombre);
  const existingByNombre = responsableByNombre.get(nombreKey);
  if (existingByNombre) return { id: existingByNombre };

  const trimOrNull = (value: string | null) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  };

  if (!isOnline()) {
    const result = await createResponsable(entidadId, {
      nombre,
      dni: dni ?? "",
      email: trimOrNull(data.responsableEmail) ?? undefined,
      telefono: trimOrNull(data.responsableTelefono) ?? undefined,
    });
    if (result.error || !result.data) {
      return { error: result.error ?? "No se pudo crear el responsable." };
    }
    if (dni) responsableByDni.set(dni, result.data.id);
    responsableByNombre.set(nombreKey, result.data.id);
    responsablesCreados.count += 1;
    return { id: result.data.id };
  }

  const supabase = getSupabaseClient();
  const { data: row, error } = await supabase
    .from("responsables")
    .insert({
      entidad_id: entidadId,
      nombre,
      dni,
      email: trimOrNull(data.responsableEmail),
      telefono: trimOrNull(data.responsableTelefono),
      cargo: RESPONSABLE_CARGO_DEFAULT,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505" && error.message.includes("dni")) {
      return { error: `Ya existe un responsable con DNI ${dni} en esta entidad.` };
    }
    if (error.code === "23505") {
      return { error: `Ya existe un responsable llamado «${nombre}» en esta entidad.` };
    }
    return { error: error.message };
  }

  if (dni) responsableByDni.set(dni, row.id as string);
  responsableByNombre.set(nombreKey, row.id as string);
  responsablesCreados.count += 1;
  return { id: row.id as string };
}

export async function importAmbientes(
  entidadId: string,
  filas: ImportAmbienteFila[],
  options?: {
    filaOffset?: number;
    onProgress?: (progress: ImportProgress) => void;
  },
): Promise<{ data?: ImportAmbientesResult; error?: string }> {
  const profile = await fetchProfile();
  if (!profile) return { error: "Sesión no válida." };
  if (profile.rol !== "CONTADOR") return { error: "No autorizado." };
  if (!entidadId) return { error: "Entidad no válida." };
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

  const context = await getImportAmbientesContext(entidadId);
  const principal = findPrincipalSede(context.sedes);

  const sedeLookup = buildSedeLookup(context.sedes);
  const responsableByDni = buildResponsableDniLookup(context.responsables);
  const responsableByNombre = buildResponsableNombreLookup(context.responsables);
  const existingKeys = buildExistingAmbienteKeys(context.ambientes);
  const batchKeys = new Set<string>();
  const sedesCreadas = { count: 0 };
  const responsablesCreados = { count: 0 };

  const errores: ImportAmbienteErrorItem[] = [];
  let importados = 0;
  const filaOffset = options?.filaOffset ?? 0;
  const onProgress = options?.onProgress;
  onProgress?.(toImportProgress(0, filas.length));

  for (let i = 0; i < filas.length; i++) {
    try {
    const fila = filas[i]!;
    const filaExcel = filaOffset + i + 2;

    const parsed = parseImportAmbienteFila(fila);
    if (!parsed.ok) {
      errores.push({ fila: filaExcel, datos: fila, motivo: parsed.motivo });
      continue;
    }

    const dup = validateImportAmbienteDuplicado(parsed.data, existingKeys, batchKeys);
    if (!dup.ok) {
      errores.push({ fila: filaExcel, datos: fila, motivo: dup.motivo });
      continue;
    }

    const sedeResult = await resolveSedeId(
      entidadId,
      parsed.data,
      sedeLookup,
      principal?.sedeId ?? null,
      sedesCreadas,
    );
    if ("error" in sedeResult) {
      errores.push({ fila: filaExcel, datos: fila, motivo: sedeResult.error });
      continue;
    }

    const responsableResult = await resolveResponsableId(
      entidadId,
      parsed.data,
      responsableByDni,
      responsableByNombre,
      responsablesCreados,
    );
    if ("error" in responsableResult) {
      errores.push({ fila: filaExcel, datos: fila, motivo: responsableResult.error });
      continue;
    }

    if (!isOnline()) {
      const ambienteResult = await createAmbiente({
        sedeId: sedeResult.id,
        nombre: parsed.data.ambienteNombre,
        descripcion: parsed.data.ambienteDescripcion ?? undefined,
        responsableId: responsableResult.id,
      });
      if (ambienteResult.error) {
        errores.push({ fila: filaExcel, datos: fila, motivo: ambienteResult.error });
        continue;
      }
    } else {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from("ambientes").insert({
        sede_id: sedeResult.id,
        nombre: parsed.data.ambienteNombre,
        descripcion: parsed.data.ambienteDescripcion,
        responsable_id: responsableResult.id,
      });

      if (error) {
        errores.push({ fila: filaExcel, datos: fila, motivo: error.message });
        continue;
      }
    }

    existingKeys.add(dup.key);
    batchKeys.add(dup.key);
    importados += 1;
    } finally {
      onProgress?.(toImportProgress(i + 1, filas.length));
    }
  }

  return {
    data: {
      totalFilas: filas.length,
      importados,
      sedesCreadas: sedesCreadas.count,
      responsablesCreados: responsablesCreados.count,
      errores,
    },
  };
}
