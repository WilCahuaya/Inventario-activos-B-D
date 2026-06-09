import type { Entidad } from "@inventario/types";
import { getSupabaseClient } from "./supabase";

export interface CreateEntidadInput {
  nombre: string;
  ruc?: string;
  direccion?: string;
  admin_nombre?: string;
  admin_email?: string;
  admin_telefono?: string;
}

async function inviteAdminAfterSave(
  entidadId: string,
  adminEmail: string,
  adminNombre: string,
  entidadNombre: string,
): Promise<string | null> {
  if (!window.electronAPI?.inviteEntidadAdmin) {
    return "Entidad guardada. Configure SUPABASE_SERVICE_ROLE_KEY para enviar la invitación por correo.";
  }

  const result = await window.electronAPI.inviteEntidadAdmin({
    entidadId,
    email: adminEmail,
    nombre: adminNombre,
    entidadNombre,
  });

  if (result.error) return `Entidad guardada, pero la invitación falló: ${result.error}`;
  return result.message ?? result.warning ?? null;
}

export async function listEntidades(): Promise<Entidad[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("entidades")
    .select("*")
    .eq("activo", true)
    .order("nombre");

  if (error) throw new Error(error.message);
  return (data ?? []) as Entidad[];
}

export async function createEntidad(
  input: CreateEntidadInput,
): Promise<{ data?: Entidad; error?: string; inviteMessage?: string | null }> {
  const nombre = input.nombre.trim();
  const adminEmail = input.admin_email?.trim() || null;
  const adminNombre = input.admin_nombre?.trim() || null;

  if (!nombre) return { error: "La razón social es obligatoria." };
  if (!adminEmail) return { error: "El correo del administrador es obligatorio." };
  if (!adminNombre) return { error: "El nombre del administrador es obligatorio." };

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("entidades")
    .insert({
      nombre,
      ruc: input.ruc?.trim() || null,
      direccion: input.direccion?.trim() || null,
      admin_nombre: adminNombre,
      admin_email: adminEmail,
      admin_telefono: input.admin_telefono?.trim() || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  const inviteMessage = await inviteAdminAfterSave(
    (data as Entidad).id,
    adminEmail,
    adminNombre,
    nombre,
  );

  return { data: data as Entidad, inviteMessage };
}

export async function updateEntidad(
  entidadId: string,
  input: CreateEntidadInput,
): Promise<{ data?: Entidad; error?: string; inviteMessage?: string | null }> {
  const nombre = input.nombre.trim();
  const adminEmail = input.admin_email?.trim() || null;
  const adminNombre = input.admin_nombre?.trim() || null;

  if (!nombre) return { error: "La razón social es obligatoria." };
  if (!adminEmail) return { error: "El correo del administrador es obligatorio." };
  if (!adminNombre) return { error: "El nombre del administrador es obligatorio." };

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("entidades")
    .update({
      nombre,
      ruc: input.ruc?.trim() || null,
      direccion: input.direccion?.trim() || null,
      admin_nombre: adminNombre,
      admin_email: adminEmail,
      admin_telefono: input.admin_telefono?.trim() || null,
    })
    .eq("id", entidadId)
    .eq("activo", true)
    .select()
    .single();

  if (error) return { error: error.message };

  const inviteMessage = await inviteAdminAfterSave(
    entidadId,
    adminEmail,
    adminNombre,
    nombre,
  );

  return { data: data as Entidad, inviteMessage };
}

export async function deleteEntidad(
  entidadId: string,
): Promise<{ success?: true; error?: string }> {
  const supabase = getSupabaseClient();

  const { count } = await supabase
    .from("activos")
    .select("*", { count: "exact", head: true })
    .eq("entidad_id", entidadId);

  if ((count ?? 0) > 0) {
    return { error: "No puede eliminar una entidad que tiene activos registrados." };
  }

  const { error } = await supabase
    .from("entidades")
    .update({ activo: false })
    .eq("id", entidadId);

  if (error) return { error: error.message };
  return { success: true };
}
