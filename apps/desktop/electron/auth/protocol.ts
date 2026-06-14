import { app } from "electron";
import path from "path";
import { OAUTH_CALLBACK_PROTOCOL } from "../../shared/auth/constants";

let activeHandler: ((callbackUrl: string) => void) | null = null;

export function setProtocolAuthHandler(handler: ((callbackUrl: string) => void) | null): void {
  activeHandler = handler;
}

export function handleProtocolAuthUrl(url: string): void {
  if (!url.startsWith(`${OAUTH_CALLBACK_PROTOCOL}://`)) return;
  console.info("[auth] Enlace de protocolo recibido:", url);
  activeHandler?.(url);
}

export function getProtocolUrlFromArgv(argv: string[]): string | null {
  return argv.find((arg) => arg.startsWith(`${OAUTH_CALLBACK_PROTOCOL}://`)) ?? null;
}

export function registerAuthProtocol(): void {
  if (process.platform === "win32" && process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(
        OAUTH_CALLBACK_PROTOCOL,
        process.execPath,
        [path.resolve(process.argv[1])],
      );
      return;
    }
  }

  app.setAsDefaultProtocolClient(OAUTH_CALLBACK_PROTOCOL);
}

export function attachProtocolListeners(): void {
  app.on("open-url", (event, url) => {
    event.preventDefault();
    handleProtocolAuthUrl(url);
  });
}
