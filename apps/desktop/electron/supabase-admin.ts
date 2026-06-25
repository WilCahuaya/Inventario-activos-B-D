import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { getServiceRoleKey, getSupabaseUrl } from "./env";

export function createAdminClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getServiceRoleKey();
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: {
      transport: WebSocket as unknown as typeof globalThis.WebSocket,
    },
  });
}
