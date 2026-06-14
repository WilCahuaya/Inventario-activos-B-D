import { DESKTOP_OAUTH_REDIRECT_URL } from "@shared/auth/constants";

export function getAuthCallbackUrl(): string {
  if (typeof window === "undefined") {
    return DESKTOP_OAUTH_REDIRECT_URL;
  }

  if (window.location.protocol === "file:") {
    return window.electronAPI?.authCallbackUrl ?? DESKTOP_OAUTH_REDIRECT_URL;
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

  if (window.electronAPI?.authCallbackUrl) {
    return window.electronAPI.authCallbackUrl;
  }

  return `${window.location.origin}/auth/callback`;
}
