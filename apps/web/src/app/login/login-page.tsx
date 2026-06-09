"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, CardContent, CardDescription, CardHeader } from "@inventario/ui";
import { BrandLogo } from "@/components/public/BrandLogo";
import { ThemeToggle } from "@/components/public/ThemeToggle";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "auth") {
      setError("No se pudo completar el inicio de sesión con Google. Intente nuevamente.");
    } else if (err === "no_profile") {
      setError(
        "Su cuenta de Google no está autorizada. Contacte al administrador para que active su perfil en el sistema.",
      );
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
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted to-primary/15 p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="items-center space-y-4 text-center">
          <BrandLogo size="large" />
          <CardDescription>Inventario de Activos Fijos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Inicie sesión con su cuenta corporativa de Google
          </p>
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
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
