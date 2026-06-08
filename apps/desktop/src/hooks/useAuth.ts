import { useEffect, useState } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { getAuthCallbackUrl } from "../lib/auth-config";
import { getSupabaseClient, isSupabaseConfigured } from "../lib/supabase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    const supabase = getSupabaseClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [configured]);

  useEffect(() => {
    if (!configured || !window.electronAPI?.onAuthCallback) return;

    const unsubscribe = window.electronAPI.onAuthCallback(async (callbackUrl) => {
      await completeOAuthCallback(callbackUrl);
    });

    return unsubscribe;
  }, [configured]);

  useEffect(() => {
    if (!configured) return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code || !window.location.pathname.includes("/auth/callback")) return;

    void completeOAuthCallback(window.location.href).then(() => {
      window.history.replaceState({}, "", "/");
    });
  }, [configured]);

  return { user, loading, configured };
}

async function completeOAuthCallback(callbackUrl: string) {
  const url = new URL(callbackUrl);
  const code = url.searchParams.get("code");
  if (!code) throw new Error("Código OAuth no recibido");

  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
}

export async function signInWithGoogle() {
  const supabase = getSupabaseClient();
  const redirectTo = getAuthCallbackUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) return { error };

  if (data?.url) {
    if (window.electronAPI?.openGoogleAuth) {
      try {
        await window.electronAPI.openGoogleAuth(data.url);
        return { error: null };
      } catch (err) {
        return {
          error: err instanceof Error ? err : new Error("Autenticación cancelada"),
        };
      }
    }

    window.location.href = data.url;
  }

  return { error: null };
}

export async function signOut() {
  const supabase = getSupabaseClient();
  return supabase.auth.signOut();
}
