import {
  buildDesktopOAuthRedirectUrl,
  DESKTOP_OAUTH_REDIRECT_URL,
} from "@shared/auth/constants";

function siteOriginFromEnv(): string | null {
  const fromEnv = import.meta.env.VITE_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return null;
}

/** Redirect OAuth: puente Vercel en escritorio empaquetado; localhost en dev web. */
export function getAuthCallbackUrl(): string {
  if (typeof window === "undefined") {
    return buildDesktopOAuthRedirectUrl(siteOriginFromEnv());
  }

  if (window.location.protocol === "file:" || window.electronAPI?.platform) {
    return buildDesktopOAuthRedirectUrl(siteOriginFromEnv());
  }

  const isViteDevServer =
    import.meta.env.DEV &&
    window.location.protocol.startsWith("http") &&
    (window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "localhost") &&
    window.location.port === "5173";

  if (isViteDevServer) {
    return `${window.location.origin}/auth/callback`;
  }

  return `${window.location.origin}/auth/callback`;
}

export function getLocalOAuthCallbackUrl(): string {
  return window.electronAPI?.authCallbackUrl ?? DESKTOP_OAUTH_REDIRECT_URL;
}
