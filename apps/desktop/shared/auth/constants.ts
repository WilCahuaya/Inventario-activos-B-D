export const OAUTH_CALLBACK_PORT = 54324;
export const OAUTH_CALLBACK_PATH = "/auth/callback";
export const OAUTH_DESKTOP_BRIDGE_PATH = "/auth/desktop-bridge";
export const OAUTH_CALLBACK_PROTOCOL = "pe.bdconsultores.inventario";
export const OAUTH_CALLBACK_PROTOCOL_URL = `${OAUTH_CALLBACK_PROTOCOL}://auth/callback`;
export const OAUTH_CALLBACK_URL = `http://localhost:${OAUTH_CALLBACK_PORT}${OAUTH_CALLBACK_PATH}`;
export const OAUTH_CALLBACK_URL_IPV4 = `http://127.0.0.1:${OAUTH_CALLBACK_PORT}${OAUTH_CALLBACK_PATH}`;

/** Callback HTTP local (fallback si no hay Site URL HTTPS). */
export const DESKTOP_OAUTH_REDIRECT_URL = OAUTH_CALLBACK_URL;

/**
 * Redirect OAuth de escritorio: puente HTTPS (Vercel) → localhost:54324.
 * Debe estar en Supabase Redirect URLs (p. ej. https://bdconsultores.vercel.app/auth/desktop-bridge).
 */
export function buildDesktopOAuthRedirectUrl(siteOrigin?: string | null): string {
  const origin = siteOrigin?.trim().replace(/\/$/, "") ?? "";
  if (origin.startsWith("https://")) {
    return `${origin}${OAUTH_DESKTOP_BRIDGE_PATH}`;
  }
  return DESKTOP_OAUTH_REDIRECT_URL;
}

/** ¿La URL trae code / tokens / error de OAuth? (cualquier host, p. ej. Site URL). */
export function hasOAuthCallbackPayload(targetUrl: string): boolean {
  if (!targetUrl) return false;
  return (
    targetUrl.includes("code=") ||
    targetUrl.includes("access_token=") ||
    targetUrl.includes("error=")
  );
}

export function isAuthCallbackUrl(targetUrl: string): boolean {
  if (!hasOAuthCallbackPayload(targetUrl)) return false;

  return (
    targetUrl.startsWith(OAUTH_CALLBACK_PROTOCOL_URL) ||
    targetUrl.startsWith(`${OAUTH_CALLBACK_PROTOCOL}://`) ||
    targetUrl.startsWith(OAUTH_CALLBACK_URL) ||
    targetUrl.startsWith(OAUTH_CALLBACK_URL_IPV4) ||
    (targetUrl.includes(`:${OAUTH_CALLBACK_PORT}`) && targetUrl.includes(OAUTH_CALLBACK_PATH))
  );
}

/**
 * Callback válido para escritorio: puerto local/protocolo, o cualquier URL con payload
 * (cuando Supabase cae al Site URL no permitido, p. ej. bdconsultores.org).
 */
export function isDesktopOAuthResultUrl(targetUrl: string): boolean {
  return isAuthCallbackUrl(targetUrl) || hasOAuthCallbackPayload(targetUrl);
}
