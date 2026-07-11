import type { Profile } from "@inventario/types";
import type { AccesoInvitacionEstado } from "@inventario/auth-invite";
import {
  validarDesactivarUsuario,
  validarEliminarUsuario,
  validarNombreContador,
  validarReactivarUsuario,
  type UsuarioGestionResumen,
} from "@inventario/types";
import { fetchProfile } from "./profile";
import { finalizeResendInviteResult } from "./resend-result";
import { getSupabaseClient } from "./supabase";
import { resendInvitacionViaWebApi } from "./web-api";

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
  acceso_estado?: AccesoInvitacionEstado;
}

async function enrichAccesoEstado(
  usuarios: ProfileConEntidad[],
): Promise<ProfileConEntidad[]> {
  if (!window.electronAPI?.getUsuariosAccesoEstado) {
    return usuarios;
  }

  try {
    const estados = await window.electronAPI.getUsuariosAccesoEstado(
      usuarios.map((u) => u.email),
    );

    return usuarios.map((usuario) => ({
      ...usuario,
      acceso_estado: estados[usuario.email.toLowerCase()] ?? "desconocido",
    }));
  } catch {
    return usuarios;
  }
}

async function loadResendTarget(userId: string) {
  const supabase = getSupabaseClient();
  const { data: row, error } = await supabase
    .from("profiles")
    .select("*, entidades(nombre)")
    .eq("id", userId)
    .maybeSingle();

  if (error || !row) {
    return { error: "Usuario no encontrado." as const };
  }

  const { entidades, ...target } = row as Profile & {
    entidades: { nombre: string } | null;
  };

  if (target.rol !== "CONTADOR" && target.rol !== "ADMIN_ENTIDAD") {
    return { error: "Rol de usuario no admitido para invitación." as const };
  }

  return {
    target,
    entidadNombre: entidades?.nombre ?? null,
  };
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

  return { data: await enrichAccesoEstado(usuarios) };
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

  const nombreError = validarNombreContador(nombre);
  if (nombreError) return { error: nombreError };

  if (!window.electronAPI?.inviteContador) {
    return {
      error:
        "Invitación no disponible. Configure SUPABASE_SERVICE_ROLE_KEY en apps/desktop/.env.local.",
    };
  }

  const result = await window.electronAPI.inviteContador({ email, nombre, mode: "invite" });
  if (result.error) return { error: result.error };
  return { message: result.message ?? result.warning ?? "Invitación enviada." };
}

export async function resendInvitacionUsuario(
  userId: string,
): Promise<{ message?: string; error?: string }> {
  try {
    const profile = await fetchProfile();
    if (!profile) return { error: "Sesión no válida." };
    if (profile.rol !== "CONTADOR") return { error: "No autorizado." };

    const loaded = await loadResendTarget(userId);
    if ("error" in loaded) return { error: loaded.error };

    const { target, entidadNombre } = loaded;
    const errors: string[] = [];

    if (window.electronAPI?.resendInvitacionUsuario) {
      try {
        const electronResult = await window.electronAPI.resendInvitacionUsuario({
          email: target.email,
          nombre: target.nombre,
          rol: target.rol,
          entidadId: target.entidad_id,
          entidadNombre,
        });
        const finalized = finalizeResendInviteResult(electronResult);
        if (!finalized.error) {
          return finalized;
        }
        errors.push(finalized.error);
      } catch (err) {
        errors.push(
          err instanceof Error ? err.message : "Error al reenviar desde la aplicación de escritorio.",
        );
      }
    } else {
      errors.push(
        "Reenvío local no disponible. Configure SUPABASE_SERVICE_ROLE_KEY en apps/desktop/.env.local.",
      );
    }

    if (typeof navigator !== "undefined" && navigator.onLine) {
      const webResult = await resendInvitacionViaWebApi(userId);
      const finalized = finalizeResendInviteResult(webResult);
      if (!finalized.error) {
        return finalized;
      }
      errors.push(finalized.error);
    }

    const uniqueErrors = [...new Set(errors.filter(Boolean))];
    return {
      error:
        uniqueErrors.join(" ") ||
        "No se pudo reenviar la invitación. Verifique su conexión y la configuración de correo.",
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Error inesperado al reenviar la invitación.",
    };
  }
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
