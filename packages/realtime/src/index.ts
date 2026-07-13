import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export type SubscribeActivosChangesOptions = {
  enabled?: boolean;
  /** Si se indica, solo escucha cambios de esa entidad. */
  entidadId?: string | null;
  debounceMs?: number;
  onChange: () => void;
};

export type SubscribeEstructuraChangesOptions = {
  enabled?: boolean;
  /** Admin: limita entidades/sedes/responsables a esa entidad. Ambientes van por RLS. */
  entidadId?: string | null;
  debounceMs?: number;
  onChange: () => void;
};

/** Evento DOM en desktop para que vistas montadas (p. ej. Ambientes) recarguen. */
export const ESTRUCTURA_REFRESH_EVENT = "inventario:refresh-estructura";

type AnySupabaseClient = SupabaseClient<any, "public", any>;

type PostgresChangeConfig = {
  event: "*";
  schema: "public";
  table: string;
  filter?: string;
};

function activosChangesConfig(entidadId?: string | null): PostgresChangeConfig {
  const changeConfig: PostgresChangeConfig = {
    event: "*",
    schema: "public",
    table: "activos",
  };

  if (entidadId) {
    changeConfig.filter = `entidad_id=eq.${entidadId}`;
  }

  return changeConfig;
}

function estructuraTableConfigs(entidadId?: string | null): PostgresChangeConfig[] {
  return [
    {
      event: "*",
      schema: "public",
      table: "entidades",
      ...(entidadId ? { filter: `id=eq.${entidadId}` } : {}),
    },
    {
      event: "*",
      schema: "public",
      table: "sedes",
      ...(entidadId ? { filter: `entidad_id=eq.${entidadId}` } : {}),
    },
    {
      event: "*",
      schema: "public",
      table: "responsables",
      ...(entidadId ? { filter: `entidad_id=eq.${entidadId}` } : {}),
    },
    // ambientes no tiene entidad_id; RLS limita lo que llega al cliente.
    {
      event: "*",
      schema: "public",
      table: "ambientes",
    },
  ];
}

async function syncRealtimeAuth(supabase: AnySupabaseClient, accessToken: string) {
  await supabase.realtime.setAuth(accessToken);
}

function createDebouncedSubscription(
  supabase: AnySupabaseClient,
  options: {
    enabled: boolean;
    channelName: string;
    debounceMs: number;
    onChange: () => void;
    configs: PostgresChangeConfig[];
    logLabel: string;
  },
): () => void {
  const { enabled, channelName, debounceMs, onChange, configs, logLabel } = options;

  if (!enabled) {
    return () => {};
  }

  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let channel: RealtimeChannel | null = null;
  let authUnsubscribe: (() => void) | null = null;

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

    let next = supabase.channel(channelName);
    for (const config of configs) {
      next = next.on("postgres_changes", config, () => {
        schedule();
      });
    }

    channel = next.subscribe((status, err) => {
      if (status === "CHANNEL_ERROR") {
        console.warn(`[${logLabel} realtime] error de canal:`, err?.message ?? err);
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
  const channelName = entidadId ? `activos-rt-${entidadId}` : "activos-rt-global";

  return createDebouncedSubscription(supabase, {
    enabled,
    channelName,
    debounceMs,
    onChange,
    configs: [activosChangesConfig(entidadId)],
    logLabel: "activos",
  });
}

/**
 * Suscripción a cambios en entidades, sedes, ambientes y responsables.
 */
export function subscribeEstructuraChanges(
  supabase: AnySupabaseClient,
  options: SubscribeEstructuraChangesOptions,
): () => void {
  const { enabled = true, entidadId, debounceMs = 600, onChange } = options;
  const channelName = entidadId ? `estructura-rt-${entidadId}` : "estructura-rt-global";

  return createDebouncedSubscription(supabase, {
    enabled,
    channelName,
    debounceMs,
    onChange,
    configs: estructuraTableConfigs(entidadId),
    logLabel: "estructura",
  });
}

/** Dispara recarga de vistas estructurales en desktop (AmbientesView, etc.). */
export function dispatchEstructuraRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ESTRUCTURA_REFRESH_EVENT));
}
