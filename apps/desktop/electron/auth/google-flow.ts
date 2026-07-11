import type { BrowserWindow } from "electron";
import {
  buildDesktopOAuthRedirectUrl,
  isDesktopOAuthResultUrl,
  OAUTH_CALLBACK_PORT,
} from "../../shared/auth/constants";
import { ensureDesktopOAuthRedirect, extractOAuthRedirectTo } from "../../shared/auth/oauth-url";
import { getSiteOrigin } from "../env";
import { ensureOAuthCallbackServer, setOAuthCallbackHandler } from "./callback-server";
import { closeOAuthWindow } from "./oauth-window";
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

  const desktopRedirect = buildDesktopOAuthRedirectUrl(getSiteOrigin());
  const fixedOAuthUrl = ensureDesktopOAuthRedirect(oauthUrl, desktopRedirect);
  console.info("[auth] redirect_to:", extractOAuthRedirectTo(fixedOAuthUrl));
  console.info("[auth] desktop redirect target:", desktopRedirect);

  await ensureOAuthCallbackServer();
  await tryEnsureSiteUrlCatchServer();

  deps.setOAuthInProgress(true);

  try {
    console.info(
      "[auth] Abriendo Google en navegador del sistema. Callback local en puerto",
      OAUTH_CALLBACK_PORT,
    );
    closeOAuthWindow();
    await openSystemBrowser(fixedOAuthUrl);

    return await new Promise<string>((resolve, reject) => {
      let settled = false;
      let timeoutId: NodeJS.Timeout | undefined;

      const cleanup = () => {
        setOAuthCallbackHandler(null);
        setProtocolAuthHandler(null);
        stopSiteUrlCatchServer();
        closeOAuthWindow();
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
        if (!isDesktopOAuthResultUrl(callbackUrl)) {
          console.warn("[auth] Callback ignorado:", callbackUrl);
          return;
        }
        finish(callbackUrl);
      };

      setOAuthCallbackHandler(handleAuthCallback);
      setProtocolAuthHandler(handleAuthCallback);

      timeoutId = setTimeout(() => {
        fail(
          "Tiempo de espera agotado. Tras Google debe abrirse el puente " +
            `(${desktopRedirect}) y luego localhost:${OAUTH_CALLBACK_PORT}. ` +
            "En Supabase → Authentication → URL Configuration agregue ese puente en Redirect URLs " +
            "y use Site URL = https://bdconsultores.vercel.app (no bdconsultores.org).",
        );
      }, AUTH_TIMEOUT_MS);
    });
  } catch (error) {
    deps.setOAuthInProgress(false);
    setOAuthCallbackHandler(null);
    setProtocolAuthHandler(null);
    stopSiteUrlCatchServer();
    closeOAuthWindow();
    throw error instanceof Error ? error : new Error("No se pudo abrir el navegador");
  }
}
