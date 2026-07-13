import { useEffect, useRef } from "react";

/**
 * Refresca datos al volver a enfocar la ventana de Desktop
 * (p. ej. después de cambios hechos en Web).
 */
export function useVisibilityRefresh(options: {
  enabled: boolean;
  onRefresh: () => void | Promise<void>;
  debounceMs?: number;
}) {
  const { enabled, onRefresh, debounceMs = 400 } = options;
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void onRefreshRef.current();
      }, debounceMs);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") schedule();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", schedule);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", schedule);
    };
  }, [enabled, debounceMs]);
}
