"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { subscribeActivosChanges } from "@inventario/realtime";
import { createClient } from "@/lib/supabase/client";

interface ActivosRealtimeSyncProps {
  entidadId?: string | null;
}

/**
 * Refresca las server components del panel cuando otro cliente modifica activos.
 */
export function ActivosRealtimeSync({ entidadId }: ActivosRealtimeSyncProps) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    return subscribeActivosChanges(supabase, {
      entidadId,
      onChange: () => {
        router.refresh();
      },
    });
  }, [router, entidadId]);

  return null;
}
