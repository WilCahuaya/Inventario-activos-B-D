import type { BrowserWindow } from "electron";
import {
  DESKTOP_OAUTH_REDIRECT_URL,
  isAuthCallbackUrl,
  OAUTH_CALLBACK_PORT,
} from "../../shared/auth/constants";
import { ensureDesktopOAuthRedirect, extractOAuthRedirectTo } from "../../shared/auth/oauth-url";
import { ensureOAuthCallbackServer, setOAuthCallbackHandler } from "./callback-server";
import { openSystemBrowser } from "./open-browser";
import { setProtocolAuthHandler } from "./protocol";
import { stopSiteUrlCatchServer, tryEnsureSiteUrlCatchServer } from "./site-url-catch";

const AUTH_TIMEOUT_MS = 5 * 60 * 1000;

export type GoogleAuthFlowDeps = {
  mainWindow: BrowserWindow | null;
  isAllowedAppNavigation: (url: string) => boolean;
  loadMainWindowContent: (win: BrowserWindow) => void;
  setOAuthInProgress: (value: boolean) => void;
};

export async function runGoogleAuthFlow(
  oauthUrl: string,
  deps: GoogleAuthFlowDeps,
): Promise<string> {
  if (!oauthUrl?.startsWith("http")) {
    throw new Error("URL de autenticación inválida");
  }

  const fixedOAuthUrl = ensureDesktopOAuthRedirect(oauthUrl, DESKTOP_OAUTH_REDIRECT_URL);
  console.info("[auth] redirect_to:", extractOAuthRedirectTo(fixedOAuthUrl));

  await ensureOAuthCallbackServer();
  await tryEnsureSiteUrlCatchServer();

  deps.setOAuthInProgress(true);

  try {
    console.info(
      "[auth] Abriendo Google en navegador externo. Callback en puerto",
      OAUTH_CALLBACK_PORT,
    );
    await openSystemBrowser(fixedOAuthUrl);

    return await new Promise<string>((resolve, reject) => {
      let settled = false;
      let timeoutId: NodeJS.Timeout | undefined;

      const cleanup = () => {
        setOAuthCallbackHandler(null);
        setProtocolAuthHandler(null);
        stopSiteUrlCatchServer();
        if (timeoutId) clearTimeout(timeoutId);
        deps.setOAuthInProgress(false);
      };

      const finish = (callbackUrl: string) => {
        if (settled) return;
        settled = true;
        cleanup();

        const { mainWindow, isAllowedAppNavigation, loadMainWindowContent } = deps;
        if (mainWindow && !mainWindow.isDestroyed()) {
          const currentUrl = mainWindow.webContents.getURL();
          if (!isAllowedAppNavigation(currentUrl)) {
            loadMainWindowContent(mainWindow);
          }
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }

        resolve(callbackUrl);
      };

      const fail = (message: string) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(message));
      };

      const handleAuthCallback = (callbackUrl: string) => {
        if (!isAuthCallbackUrl(callbackUrl)) {
          console.warn("[auth] Callback ignorado:", callbackUrl);
          return;
        }
        finish(callbackUrl);
      };

      setOAuthCallbackHandler(handleAuthCallback);
      setProtocolAuthHandler(handleAuthCallback);

      timeoutId = setTimeout(() => {
        fail(
          "Tiempo de espera agotado. Complete el inicio de sesión en el navegador o intente de nuevo.",
        );
      }, AUTH_TIMEOUT_MS);
    });
  } catch (error) {
    deps.setOAuthInProgress(false);
    setOAuthCallbackHandler(null);
    setProtocolAuthHandler(null);
    stopSiteUrlCatchServer();
    throw error instanceof Error ? error : new Error("No se pudo abrir el navegador");
  }
}
