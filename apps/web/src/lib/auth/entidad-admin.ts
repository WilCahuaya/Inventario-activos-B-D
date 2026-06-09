import type { User } from "@supabase/supabase-js";
import type { RolUsuario } from "@inventario/types";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

async function findAuthUserByEmail(email: string) {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return null;

  return data.users.find((u) => u.email?.toLowerCase() === email) ?? null;
}

async function upsertAdminProfile(userId: string, email: string, nombre: string, entidadId: string) {
  const admin = createAdminClient();
  if (!admin) return { error: "Sin cliente admin." };

  await admin
    .from("profiles")
    .update({ activo: false })
    .eq("entidad_id", entidadId)
    .eq("rol", "ADMIN_ENTIDAD" as RolUsuario)
    .neq("id", userId);

  const payload = {
    id: userId,
    email: normalizeEmail(email),
    nombre: nombre.trim(),
    rol: "ADMIN_ENTIDAD" as RolUsuario,
    entidad_id: entidadId,
    activo: true,
  };

  const { data: existing } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();

  if (existing) {
    const { error } = await admin.from("profiles").update(payload).eq("id", userId);
    if (error) return { error: error.message };
  } else {
    const { error } = await admin.from("profiles").insert(payload);
    if (error) return { error: error.message };
  }

  return { success: true as const };
}

export async function inviteEntidadAdmin(
  entidadId: string,
  email: string,
  nombre: string,
  entidadNombre?: string,
) {
  const emailNorm = normalizeEmail(email);
  const nombreTrim = nombre.trim();

  if (!emailNorm) return { error: "El correo del administrador es obligatorio." };
  if (!nombreTrim) return { error: "El nombre del administrador es obligatorio." };

  const admin = createAdminClient();
  if (!admin) {
    return {
      success: true,
      invited: false,
      warning:
        "Entidad creada. Configure SUPABASE_SERVICE_ROLE_KEY para enviar la invitación por correo; el admin podrá ingresar con Google usando ese correo.",
    };
  }

  const existingUser = await findAuthUserByEmail(emailNorm);

  if (existingUser) {
    const result = await upsertAdminProfile(existingUser.id, emailNorm, nombreTrim, entidadId);
    if (result.error) return { error: result.error };
    return { success: true, invited: false, message: "Perfil de administrador actualizado." };
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(emailNorm, {
    data: {
      nombre: nombreTrim,
      entidad_id: entidadId,
      entidad_nombre: entidadNombre?.trim() || null,
      rol: "ADMIN_ENTIDAD",
    },
    redirectTo: `${siteOrigin()}/auth/callback`,
  });

  if (error) return { error: error.message };

  if (data.user) {
    const result = await upsertAdminProfile(data.user.id, emailNorm, nombreTrim, entidadId);
    if (result.error) return { error: result.error };
  }

  return {
    success: true,
    invited: true,
    message: `Invitación enviada a ${emailNorm}. El administrador podrá ingresar con Google usando ese correo.`,
  };
}

export async function provisionProfileFromEntidad(user: User) {
  const email = user.email ? normalizeEmail(user.email) : null;
  if (!email) return null;

  const admin = createAdminClient();
  if (!admin) return null;

  const { data: existing } = await admin
    .from("profiles")
    .select("id, rol, activo")
    .eq("id", user.id)
    .maybeSingle();

  if (existing?.activo) return existing;

  const { data: entidad } = await admin
    .from("entidades")
    .select("id, admin_nombre, admin_email")
    .eq("activo", true)
    .ilike("admin_email", email)
    .maybeSingle();

  if (!entidad) return null;

  const nombre =
    entidad.admin_nombre?.trim() ||
    (typeof user.user_metadata?.nombre === "string" ? user.user_metadata.nombre : null) ||
    (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null) ||
    email;

  const result = await upsertAdminProfile(user.id, email, nombre, entidad.id);
  if (result.error) return null;

  return admin
    .from("profiles")
    .select("rol, activo")
    .eq("id", user.id)
    .maybeSingle()
    .then((r) => r.data);
}
