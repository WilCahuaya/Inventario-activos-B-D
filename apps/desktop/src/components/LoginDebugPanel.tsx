import { useState } from "react";
import { Button } from "@inventario/ui";
import type { AuthLoginDebug } from "../hooks/useAuth";

function formatAuthDebug(debug: AuthLoginDebug): string {
  return [
    `Callback esperado: ${debug.callbackUrl}`,
    `redirect_to (Supabase): ${debug.oauthRedirectBefore ?? "(aún no — pulse Continuar con Google)"}`,
    `redirect_to (corregido): ${debug.oauthRedirectAfter ?? "(aún no — pulse Continuar con Google)"}`,
    `¿Se corrigió?: ${debug.redirectPatched ? "sí" : "no"}`,
    `Servidor local: ${debug.serverOk === null ? "—" : debug.serverOk ? "OK" : "error"}`,
    debug.oauthUrlKind ? `Tipo URL: ${debug.oauthUrlKind}` : "",
    debug.status ? `Estado: ${debug.status}` : "",
    debug.oauthUrlPreview ? `URL OAuth: ${debug.oauthUrlPreview}…` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

type LoginDebugPanelProps = {
  debug: AuthLoginDebug | null;
  forceVisible?: boolean;
};

export function LoginDebugPanel({ debug, forceVisible = false }: LoginDebugPanelProps) {
  const [expanded, setExpanded] = useState(forceVisible);
  const isDev = import.meta.env.DEV;

  if (!window.electronAPI?.platform || !debug) return null;
  if (!isDev && !forceVisible) return null;

  const visible = forceVisible || expanded;

  return (
    <div className="space-y-2 border-t pt-3">
      {isDev && !forceVisible && (
        <button
          type="button"
          className="text-xs text-muted-foreground underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Ocultar diagnóstico" : "Ver diagnóstico de login"}
        </button>
      )}
      {visible && (
        <div className="space-y-2 rounded-md bg-muted/50 p-3 text-left text-xs text-muted-foreground">
          <p>
            <strong>Electron:</strong> {window.electronAPI.platform}
          </p>
          <pre className="whitespace-pre-wrap break-all font-mono text-[11px]">
            {formatAuthDebug(debug)}
          </pre>
          {isDev && (
            <p className="text-[11px]">
              Tras Google debe abrirse{" "}
              <code className="text-foreground">http://localhost:54324/auth/callback</code> en el
              navegador. Si el puerto 3000 está ocupado (app web), el login sigue usando el 54324.
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void navigator.clipboard.writeText(formatAuthDebug(debug))}
          >
            Copiar diagnóstico
          </Button>
        </div>
      )}
    </div>
  );
}
