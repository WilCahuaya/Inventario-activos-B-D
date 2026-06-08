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
import { signInWithGoogle, signOut, useAuth } from "./hooks/useAuth";

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
        <CardTitle className="text-primary">{APP_NAME}</CardTitle>
        <CardDescription>{APP_CLIENT} — App de escritorio</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center text-sm text-muted-foreground">
          Inicie sesión con su cuenta corporativa de Google
        </p>
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <Button type="button" className="w-full" disabled={loading} onClick={handleGoogleLogin}>
          {loading ? "Esperando Google…" : "Continuar con Google"}
        </Button>
      </CardContent>
    </Card>
  );
}

function Dashboard({ email }: { email: string }) {
  return (
    <div className="w-full max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Panel de campo</CardTitle>
          <CardDescription>
            Sesión activa — módulos de escaneo e impresión en Fase 3
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            Usuario: <strong>{email}</strong>
          </p>
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
    <Card className="w-full max-w-md border-amber-300 bg-amber-50">
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-6">
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
