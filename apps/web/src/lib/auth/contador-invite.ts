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

async function upsertContadorProfile(userId: string, email: string, nombre: string) {
  const admin = createAdminClient();
  if (!admin) return { error: "Sin cliente admin." };

  const { data: existing } = await admin
    .from("profiles")
    .select("id, rol, activo")
    .eq("id", userId)
    .maybeSingle();

  if (existing?.activo && existing.rol === ("ADMIN_ENTIDAD" as RolUsuario)) {
    return { error: "Este usuario ya es administrador de una entidad." };
  }

  const payload = {
    id: userId,
    email: normalizeEmail(email),
    nombre: nombre.trim(),
    rol: "CONTADOR" as RolUsuario,
    entidad_id: null,
    activo: true,
  };

  if (existing) {
    const { error } = await admin.from("profiles").update(payload).eq("id", userId);
    if (error) return { error: error.message };
  } else {
    const { error } = await admin.from("profiles").insert(payload);
    if (error) return { error: error.message };
  }

  return { success: true as const };
}

export async function inviteContador(email: string, nombre: string) {
  const emailNorm = normalizeEmail(email);
  const nombreTrim = nombre.trim();

  if (!emailNorm) return { error: "El correo es obligatorio." };
  if (!nombreTrim) return { error: "El nombre es obligatorio." };

  const admin = createAdminClient();
  if (!admin) {
    return {
      success: true,
      invited: false,
      warning:
        "Configure SUPABASE_SERVICE_ROLE_KEY para enviar la invitación por correo; el contador podrá ingresar con Google usando ese correo.",
    };
  }

  const existingUser = await findAuthUserByEmail(emailNorm);

  if (existingUser) {
    const result = await upsertContadorProfile(existingUser.id, emailNorm, nombreTrim);
    if (result.error) return { error: result.error };
    return {
      success: true,
      invited: false,
      message: "Perfil de contador actualizado. Ya puede ingresar al sistema.",
    };
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(emailNorm, {
    data: {
      nombre: nombreTrim,
      rol: "CONTADOR",
    },
    redirectTo: `${siteOrigin()}/auth/callback`,
  });

  if (error) return { error: error.message };

  if (data.user) {
    const result = await upsertContadorProfile(data.user.id, emailNorm, nombreTrim);
    if (result.error) return { error: result.error };
  }

  return {
    success: true,
    invited: true,
    message: `Invitación enviada a ${emailNorm}. El contador podrá ingresar con Google usando ese correo.`,
  };
}

export async function provisionProfileFromContador(user: User) {
  const rol = user.user_metadata?.rol;
  if (rol !== "CONTADOR") return null;

  const email = user.email ? normalizeEmail(user.email) : null;
  if (!email) return null;

  const nombre =
    (typeof user.user_metadata?.nombre === "string" ? user.user_metadata.nombre : null) ||
    (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null) ||
    email;

  const result = await upsertContadorProfile(user.id, email, nombre);
  if (result.error) return null;

  const admin = createAdminClient();
  if (!admin) return null;

  return admin
    .from("profiles")
    .select("rol, activo")
    .eq("id", user.id)
    .maybeSingle()
    .then((r) => r.data);
}
