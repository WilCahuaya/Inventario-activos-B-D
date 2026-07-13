import { useEffect, useRef } from "react";

/**
 * Refresca datos al volver a la ventana de Desktop después de haberla ocultado
 * (p. ej. cambios hechos en Web). No usa `window.focus`: en Electron dispara
 * demasiado y provoca parpadeos de carga.
 */
export function useVisibilityRefresh(options: {
  enabled: boolean;
  onRefresh: () => void | Promise<void>;
  debounceMs?: number;
  /** Mínimo entre refrescos automáticos (evita bucles). */
  minIntervalMs?: number;
}) {
  const { enabled, onRefresh, debounceMs = 400, minIntervalMs = 5000 } = options;
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const lastRefreshAtRef = useRef(0);
  const wasHiddenRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        const now = Date.now();
        if (now - lastRefreshAtRef.current < minIntervalMs) return;
        lastRefreshAtRef.current = now;
        void onRefreshRef.current();
      }, debounceMs);
    };

    const onVisible = () => {
      if (document.visibilityState === "hidden") {
        wasHiddenRef.current = true;
        return;
      }
      if (document.visibilityState === "visible" && wasHiddenRef.current) {
        wasHiddenRef.current = false;
        schedule();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, debounceMs, minIntervalMs]);
}
