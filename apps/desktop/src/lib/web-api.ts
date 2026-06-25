import { getSupabaseClient } from "./supabase";

export function getWebSiteOrigin(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "https://bdconsultores.org";
}

async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    return session.access_token;
  }

  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session?.access_token) {
    return null;
  }

  return data.session.access_token;
}

export async function resendInvitacionViaWebApi(
  userId: string,
): Promise<{ error?: string; message?: string | null; invited?: boolean; warning?: string | null }> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { error: "Sesión no válida." };
  }

  let response: Response;
  try {
    response = await fetch(`${getWebSiteOrigin()}/api/usuarios/resend-invitation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ userId }),
    });
  } catch {
    return { error: "No se pudo contactar con el servidor web." };
  }

  const raw = await response.text();
  let payload: {
    error?: string;
    message?: string | null;
    invited?: boolean;
    warning?: string | null;
  } = {};

  if (raw.trim()) {
    try {
      payload = JSON.parse(raw) as typeof payload;
    } catch {
      return {
        error: response.ok
          ? "Respuesta inválida del servidor web."
          : "El servidor web no respondió correctamente. Despliegue la última versión de la web.",
      };
    }
  }

  if (!response.ok) {
    return { error: payload.error ?? "No se pudo reenviar la invitación." };
  }

  return payload;
}
