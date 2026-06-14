export function extractOAuthRedirectTo(oauthUrl: string): string | null {
  if (!oauthUrl) return null;

  const match = oauthUrl.match(/[?&]redirect_to=([^&]+)/i);
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }

  try {
    const url = new URL(oauthUrl);
    return url.searchParams.get("redirect_to") ?? url.searchParams.get("redirect_uri");
  } catch {
    return null;
  }
}

export function forceOAuthRedirectUrl(
  oauthUrl: string,
  expectedRedirect: string,
): { url: string; patched: boolean; previous: string | null } {
  if (!oauthUrl?.trim()) {
    return { url: oauthUrl, patched: false, previous: null };
  }

  const previous = extractOAuthRedirectTo(oauthUrl);
  const encoded = encodeURIComponent(expectedRedirect);

  if (previous === expectedRedirect) {
    return { url: oauthUrl, patched: false, previous };
  }

  let nextUrl = oauthUrl;
  if (/[?&]redirect_to=/i.test(nextUrl)) {
    nextUrl = nextUrl.replace(/([?&])redirect_to=[^&]*/i, `$1redirect_to=${encoded}`);
  } else {
    const separator = nextUrl.includes("?") ? "&" : "?";
    nextUrl = `${nextUrl}${separator}redirect_to=${encoded}`;
  }

  return { url: nextUrl, patched: true, previous };
}

/** Fuerza el redirect de escritorio en la URL de authorize de Supabase. */
export function ensureDesktopOAuthRedirect(oauthUrl: string, targetRedirect: string): string {
  const { url, patched, previous } = forceOAuthRedirectUrl(oauthUrl, targetRedirect);
  if (patched) {
    console.warn("[auth] Corrigiendo redirect_to:", previous ?? "(vacío)", "->", targetRedirect);
  }
  return url;
}
