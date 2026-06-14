import { ipcMain } from "electron";
import {
  DESKTOP_OAUTH_REDIRECT_URL,
  OAUTH_CALLBACK_PORT,
} from "../../shared/auth/constants";
import { ensureOAuthCallbackServer } from "./callback-server";
import type { GoogleAuthFlowDeps } from "./google-flow";
import { runGoogleAuthFlow } from "./google-flow";

export function registerAuthIpcHandlers(getDeps: () => GoogleAuthFlowDeps): void {
  ipcMain.handle("auth:begin", () => {
    getDeps().setOAuthInProgress(true);
  });

  ipcMain.handle("auth:cancel", () => {
    getDeps().setOAuthInProgress(false);
  });

  ipcMain.handle("auth:diagnostics", async () => {
    try {
      await ensureOAuthCallbackServer();
      return {
        ok: true,
        callbackUrl: DESKTOP_OAUTH_REDIRECT_URL,
        callbackPort: OAUTH_CALLBACK_PORT,
        platform: process.platform,
      };
    } catch (error) {
      return {
        ok: false,
        callbackUrl: DESKTOP_OAUTH_REDIRECT_URL,
        callbackPort: OAUTH_CALLBACK_PORT,
        platform: process.platform,
        error: error instanceof Error ? error.message : "Error desconocido",
      };
    }
  });

  ipcMain.handle("auth:google", async (_event, oauthUrl: string) => {
    return runGoogleAuthFlow(oauthUrl, getDeps());
  });
}
