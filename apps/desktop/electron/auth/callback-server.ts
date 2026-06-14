import http from "http";
import type { Server } from "http";
import { isAuthCallbackUrl, OAUTH_CALLBACK_PORT } from "../../shared/auth/constants";

let server: Server | null = null;
let serverReady: Promise<void> | null = null;
let activeHandler: ((callbackUrl: string) => void) | null = null;

export function setOAuthCallbackHandler(handler: ((callbackUrl: string) => void) | null): void {
  activeHandler = handler;
}

export function ensureOAuthCallbackServer(): Promise<void> {
  if (serverReady) return serverReady;

  serverReady = new Promise((resolve, reject) => {
    if (server) {
      resolve();
      return;
    }

    server = http.createServer((req, res) => {
      const path = req.url ?? "/";
      if (!path.startsWith("/auth/callback")) {
        res.writeHead(404);
        res.end();
        return;
      }

      const host = req.headers.host ?? `localhost:${OAUTH_CALLBACK_PORT}`;
      const callbackUrl = `http://${host}${path}`;

      if (!isAuthCallbackUrl(callbackUrl)) {
        console.warn("[auth] Callback recibido sin credenciales OAuth:", path);
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          "<!DOCTYPE html><html><body style=\"font-family:sans-serif;padding:2rem\">" +
            "<p>Solicitud de inicio de sesión incompleta. Vuelva a la aplicación e intente de nuevo.</p>" +
            "</body></html>",
        );
        return;
      }

      activeHandler?.(callbackUrl);

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Inventario B&amp;D</title></head>" +
          "<body style=\"font-family:sans-serif;padding:2rem\">" +
          "<p><strong>Inicio de sesión correcto.</strong></p>" +
          "<p>Ya puede cerrar esta pestaña del navegador y volver a la aplicación de escritorio.</p></body></html>",
      );
    });

    server.once("error", (err: NodeJS.ErrnoException) => {
      console.error("[auth] Servidor OAuth local:", err.message);
      serverReady = null;
      reject(err);
    });

    server.listen(OAUTH_CALLBACK_PORT, () => {
      console.info(`[auth] Escuchando callback OAuth en puerto ${OAUTH_CALLBACK_PORT}`);
      resolve();
    });
  });

  return serverReady;
}
