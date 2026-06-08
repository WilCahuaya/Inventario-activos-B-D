export function getAuthCallbackUrl(): string {
  if (typeof window !== "undefined" && window.electronAPI?.authCallbackPath) {
    return `${window.location.origin}${window.electronAPI.authCallbackPath}`;
  }
  return `${window.location.origin}/auth/callback`;
}
