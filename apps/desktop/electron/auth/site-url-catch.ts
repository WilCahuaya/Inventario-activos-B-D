import http from "http";
import type { Server } from "http";
import { OAUTH_CALLBACK_PORT } from "../../shared/auth/constants";

const SITE_URL_PORT = 3000;

let catchServer: Server | null = null;
let catchServerReady: Promise<void> | null = null;

const CATCH_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Inventario B&amp;D</title>
</head>
<body style="font-family:sans-serif;padding:2rem">
  <p>Completando inicio de sesión…</p>
  <script>
    (function () {
      var target = "http://localhost:${OAUTH_CALLBACK_PORT}/auth/callback";
      var hash = window.location.hash || "";
      var query = window.location.search || "";
      if (hash.length > 1) {
        window.location.replace(target + "?" + hash.substring(1));
        return;
      }
      if (query.length > 1) {
        window.location.replace(target + query);
        return;
      }
      document.body.innerHTML = "<p>No se recibieron datos de sesión. Vuelva a la aplicación e intente de nuevo.</p>";
    })();
  </script>
</body>
</html>`;

export function ensureSiteUrlCatchServer(): Promise<void> {
  if (catchServerReady) return catchServerReady;

  catchServerReady = new Promise((resolve, reject) => {
    if (catchServer) {
      resolve();
      return;
    }

    catchServer = http.createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(CATCH_HTML);
    });

    catchServer.once("error", (err: NodeJS.ErrnoException) => {
      catchServerReady = null;
      catchServer = null;
      reject(err);
    });

    catchServer.listen(SITE_URL_PORT, () => {
      console.info(`[auth] Captura Site URL activa en http://localhost:${SITE_URL_PORT}`);
      resolve();
    });
  });

  return catchServerReady;
}

export function stopSiteUrlCatchServer(): void {
  if (!catchServer) return;
  catchServer.close();
  catchServer = null;
  catchServerReady = null;
  console.info("[auth] Captura Site URL detenida");
}
