import type { Profile } from "@inventario/types";
import {
  validarDesactivarUsuario,
  validarEliminarUsuario,
  validarReactivarUsuario,
  type UsuarioGestionResumen,
} from "@inventario/types";
import { fetchProfile } from "./profile";
import { getSupabaseClient } from "./supabase";

async function countUsuarioVinculos(userId: string): Promise<{
  activos: number;
  historial: number;
}> {
  const supabase = getSupabaseClient();
  const [activos, historial] = await Promise.all([
    supabase
      .from("activos")
      .select("id", { count: "exact", head: true })
      .or(`created_by.eq.${userId},updated_by.eq.${userId}`),
    supabase
      .from("historial_cambios")
      .select("id", { count: "exact", head: true })
      .eq("usuario_id", userId),
  ]);

  return { activos: activos.count ?? 0, historial: historial.count ?? 0 };
}

async function loadUsuarioGestion(userId: string): Promise<UsuarioGestionResumen | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, rol, activo, nombre, email")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as UsuarioGestionResumen;
}

async function loadUsuariosGestion(): Promise<UsuarioGestionResumen[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, rol, activo, nombre, email")
    .order("nombre");

  if (error) throw new Error(error.message);
  return (data ?? []) as UsuarioGestionResumen[];
}

export interface ProfileConEntidad extends Profile {
  entidad_nombre?: string | null;
}

export async function listUsuarios(): Promise<{ data?: ProfileConEntidad[]; error?: string }> {
  const profile = await fetchProfile();
  if (!profile) return { error: "Sesión no válida." };
  if (profile.rol !== "CONTADOR") return { error: "No autorizado." };

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*, entidades(nombre)")
    .order("nombre");

  if (error) return { error: error.message };

  const usuarios = (data ?? []).map((row) => {
    const { entidades, ...rest } = row as Profile & {
      entidades: { nombre: string } | null;
    };
    return {
      ...rest,
      entidad_nombre: entidades?.nombre ?? null,
    };
  });

  return { data: usuarios };
}

export async function inviteContador(input: {
  email: string;
  nombre: string;
}): Promise<{ message?: string; error?: string }> {
  const profile = await fetchProfile();
  if (!profile) return { error: "Sesión no válida." };
  if (profile.rol !== "CONTADOR") return { error: "No autorizado." };

  const email = input.email.trim();
  const nombre = input.nombre.trim();
  if (!email) return { error: "El correo es obligatorio." };
  if (!nombre) return { error: "El nombre es obligatorio." };

  if (!window.electronAPI?.inviteContador) {
    return {
      error:
        "Invitación no disponible. Configure SUPABASE_SERVICE_ROLE_KEY en apps/desktop/.env.local.",
    };
  }

  void window.electronAPI
    .inviteContador({ email, nombre })
    .catch((err) => console.error("inviteContador", err));

  return {
    message: `Invitación en proceso para ${email}. El contador podrá ingresar con Google cuando confirme el correo.`,
  };
}

export async function setUsuarioActivo(
  userId: string,
  activo: boolean,
): Promise<{ error?: string }> {
  const actor = await fetchProfile();
  if (!actor) return { error: "Sesión no válida." };
  if (actor.rol !== "CONTADOR") return { error: "No autorizado." };

  const target = await loadUsuarioGestion(userId);
  if (!target) return { error: "Usuario no encontrado." };

  const usuarios = await loadUsuariosGestion();
  const validationError = activo
    ? validarReactivarUsuario(target)
    : validarDesactivarUsuario({
        target,
        actorId: actor.id,
        usuarios,
      });

  if (validationError) return { error: validationError };

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("profiles").update({ activo }).eq("id", userId);
  if (error) return { error: error.message };
  return {};
}

export async function deleteUsuario(userId: string): Promise<{ error?: string }> {
  const actor = await fetchProfile();
  if (!actor) return { error: "Sesión no válida." };
  if (actor.rol !== "CONTADOR") return { error: "No autorizado." };

  const target = await loadUsuarioGestion(userId);
  if (!target) return { error: "Usuario no encontrado." };

  const vinculos = await countUsuarioVinculos(userId);
  const validationError = validarEliminarUsuario({
    target,
    actorId: actor.id,
    activosVinculados: vinculos.activos,
    historialVinculado: vinculos.historial,
  });

  if (validationError) return { error: validationError };

  if (!window.electronAPI?.deleteAuthUser) {
    return {
      error:
        "Eliminación no disponible. Configure SUPABASE_SERVICE_ROLE_KEY en apps/desktop/.env.local.",
    };
  }

  return window.electronAPI.deleteAuthUser(userId);
}
