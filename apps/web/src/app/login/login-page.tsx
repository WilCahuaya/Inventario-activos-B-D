"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { APP_CLIENT, APP_NAME } from "@inventario/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@inventario/ui";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("error") === "auth") {
      setError("No se pudo completar el inicio de sesión con Google. Intente nuevamente.");
    }
  }, [searchParams]);

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (msg.includes("provider is not enabled") || msg.includes("unsupported provider")) {
        setError(
          "Google no está habilitado en Supabase. Vaya a Authentication → Providers → Google, actívelo y guarde Client ID y Secret.",
        );
      } else {
        setError(authError.message);
      }
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-primary">{APP_NAME}</CardTitle>
          <CardDescription>{APP_CLIENT}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Inicie sesión con su cuenta corporativa de Google
          </p>
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <Button
            type="button"
            className="w-full"
            disabled={loading}
            onClick={handleGoogleLogin}
          >
            {loading ? "Redirigiendo…" : "Continuar con Google"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
