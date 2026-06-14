export const OAUTH_CALLBACK_PORT = 54324;
export const OAUTH_CALLBACK_PATH = "/auth/callback";
export const OAUTH_CALLBACK_PROTOCOL = "pe.bdconsultores.inventario";
export const OAUTH_CALLBACK_PROTOCOL_URL = `${OAUTH_CALLBACK_PROTOCOL}://auth/callback`;
export const OAUTH_CALLBACK_URL = `http://localhost:${OAUTH_CALLBACK_PORT}${OAUTH_CALLBACK_PATH}`;
export const OAUTH_CALLBACK_URL_IPV4 = `http://127.0.0.1:${OAUTH_CALLBACK_PORT}${OAUTH_CALLBACK_PATH}`;

/** Redirect HTTP local (Supabase y el navegador lo aceptan mejor que protocolos custom). */
export const DESKTOP_OAUTH_REDIRECT_URL = OAUTH_CALLBACK_URL;

export function isAuthCallbackUrl(targetUrl: string): boolean {
  if (!targetUrl) return false;

  const hasAuthPayload =
    targetUrl.includes("code=") ||
    targetUrl.includes("access_token=") ||
    targetUrl.includes("error=");

  if (!hasAuthPayload) return false;

  return (
    targetUrl.startsWith(OAUTH_CALLBACK_PROTOCOL_URL) ||
    targetUrl.startsWith(`${OAUTH_CALLBACK_PROTOCOL}://`) ||
    targetUrl.startsWith(OAUTH_CALLBACK_URL) ||
    targetUrl.startsWith(OAUTH_CALLBACK_URL_IPV4) ||
    (targetUrl.includes(`:${OAUTH_CALLBACK_PORT}`) && targetUrl.includes(OAUTH_CALLBACK_PATH))
  );
}
