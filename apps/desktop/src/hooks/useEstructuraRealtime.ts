import { useEffect, useRef } from "react";
import { subscribeEstructuraChanges } from "@inventario/realtime";
import { getSupabaseClient } from "../lib/supabase";

export function useEstructuraRealtime(options: {
  enabled: boolean;
  entidadId?: string | null;
  onRefresh: () => void | Promise<void>;
}) {
  const { enabled, entidadId, onRefresh } = options;
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled) return;

    const supabase = getSupabaseClient();
    return subscribeEstructuraChanges(supabase, {
      entidadId,
      onChange: () => {
        void onRefreshRef.current();
      },
    });
  }, [enabled, entidadId]);
}
