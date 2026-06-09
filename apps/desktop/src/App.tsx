import { useState } from "react";
import { APP_CLIENT, APP_NAME } from "@inventario/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@inventario/ui";
import { ThemeToggle } from "@inventario/ui/theme-toggle";
import { signInWithGoogle, signOut, useAuth } from "./hooks/useAuth";
import { useCatalogSync } from "./hooks/useCatalogSync";

function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    const { error: authError } = await signInWithGoogle();
    if (authError) setError(authError.message);
    setLoading(false);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-brand">{APP_NAME}</CardTitle>
        <CardDescription>{APP_CLIENT} — App de escritorio</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center text-sm text-muted-foreground">
          Inicie sesión con su cuenta corporativa de Google
        </p>
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        <Button type="button" className="w-full" disabled={loading} onClick={handleGoogleLogin}>
          {loading ? "Esperando Google…" : "Continuar con Google"}
        </Button>
      </CardContent>
    </Card>
  );
}

function Dashboard({ email }: { email: string }) {
  const catalog = useCatalogSync(true);

  return (
    <div className="w-full max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Panel de campo</CardTitle>
          <CardDescription>
            Sesión activa — catálogo nacional en SQLite local para uso offline
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            Usuario: <strong>{email}</strong>
          </p>

          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            {catalog.syncing ? (
              <p className="text-muted-foreground">Sincronizando catálogo nacional…</p>
            ) : catalog.error ? (
              <p className="text-destructive">{catalog.error}</p>
            ) : (
              <p>
                Catálogo local: <strong>{catalog.count.toLocaleString("es-PE")}</strong> ítems
                {catalog.syncedAt && (
                  <span className="block text-xs text-muted-foreground">
                    Última sync: {new Date(catalog.syncedAt).toLocaleString("es-PE")}
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled>
              Escanear activo (Fase 3)
            </Button>
            <Button variant="secondary" disabled>
              Registrar activo (Fase 3)
            </Button>
            <Button variant="secondary" disabled>
              Imprimir etiqueta (Fase 3)
            </Button>
          </div>
          <Button variant="outline" onClick={() => signOut()}>
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ConfigWarning() {
  return (
    <Card className="w-full max-w-md border-amber-300 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/30">
      <CardHeader>
        <CardTitle>Supabase no configurado</CardTitle>
        <CardDescription>
          Copie <code className="text-xs">.env.example</code> a{" "}
          <code className="text-xs">apps/desktop/.env.local</code> con sus credenciales.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default function App() {
  const { user, loading, configured } = useAuth();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-muted to-primary/15 p-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      {!configured ? (
        <ConfigWarning />
      ) : loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : user ? (
        <Dashboard email={user.email ?? ""} />
      ) : (
        <LoginForm />
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        Plataforma: {window.electronAPI?.platform ?? "web"} · MVP Fase 0
      </p>
    </div>
  );
}
