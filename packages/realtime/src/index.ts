import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export type SubscribeActivosChangesOptions = {
  enabled?: boolean;
  /** Si se indica, solo escucha cambios de esa entidad. */
  entidadId?: string | null;
  debounceMs?: number;
  onChange: () => void;
};

type AnySupabaseClient = SupabaseClient<any, "public", any>;

function postgresChangesConfig(entidadId?: string | null) {
  const changeConfig: {
    event: "*";
    schema: "public";
    table: "activos";
    filter?: string;
  } = {
    event: "*",
    schema: "public",
    table: "activos",
  };

  if (entidadId) {
    changeConfig.filter = `entidad_id=eq.${entidadId}`;
  }

  return changeConfig;
}

async function syncRealtimeAuth(supabase: AnySupabaseClient, accessToken: string) {
  await supabase.realtime.setAuth(accessToken);
}

/**
 * Suscripción a INSERT/UPDATE/DELETE en public.activos (Supabase Realtime).
 * Aplica setAuth con el JWT de la sesión (requerido con RLS + @supabase/ssr).
 * Devuelve función para cancelar la suscripción.
 */
export function subscribeActivosChanges(
  supabase: AnySupabaseClient,
  options: SubscribeActivosChangesOptions,
): () => void {
  const { enabled = true, entidadId, debounceMs = 600, onChange } = options;

  if (!enabled) {
    return () => {};
  }

  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let channel: RealtimeChannel | null = null;
  let authUnsubscribe: (() => void) | null = null;

  const channelName = entidadId ? `activos-rt-${entidadId}` : "activos-rt-global";

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      onChange();
    }, debounceMs);
  };

  const removeChannel = () => {
    if (!channel) return;
    const current = channel;
    channel = null;
    void supabase.removeChannel(current);
  };

  const attachChannel = () => {
    if (cancelled || channel) return;

    channel = supabase
      .channel(channelName)
      .on("postgres_changes", postgresChangesConfig(entidadId), () => {
        schedule();
      })
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("[activos realtime] error de canal:", err?.message ?? err);
        }
      });
  };

  const ensureChannel = async (accessToken: string | undefined) => {
    if (cancelled || !accessToken) {
      if (!accessToken) removeChannel();
      return;
    }

    await syncRealtimeAuth(supabase, accessToken);
    if (cancelled) return;
    attachChannel();
  };

  void (async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (cancelled) return;
    await ensureChannel(session?.access_token);
  })();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    void ensureChannel(session?.access_token);
  });
  authUnsubscribe = () => subscription.unsubscribe();

  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
    authUnsubscribe?.();
    authUnsubscribe = null;
    removeChannel();
  };
}
