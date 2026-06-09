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
import { ActivoFichaView } from "./components/ActivoFichaView";
import { ActivoFormDesktop } from "./components/ActivoFormDesktop";
import { AmbientesView } from "./components/AmbientesView";
import { AppShell, type AppSubheader, type MainNav } from "./components/AppShell";
import { DashboardView } from "./components/DashboardView";
import { EntidadesView } from "./components/EntidadesView";
import { PrintBatchLabelDialog } from "./components/PrintBatchLabelDialog";
import { PrintLabelDialog } from "./components/PrintLabelDialog";
import { UsuariosView } from "./components/UsuariosView";
import { signInWithGoogle, signOut, useAuth } from "./hooks/useAuth";
import { useActivosCache } from "./hooks/useActivosCache";
import { useCatalogSync } from "./hooks/useCatalogSync";
import { useOnline } from "./hooks/useOnline";
import { useProfile } from "./hooks/useProfile";
import { useSelectedEntidad } from "./hooks/useSelectedEntidad";
import { useSyncQueue } from "./hooks/useSyncQueue";
import type { ActivoConUbicacion } from "./lib/activos";

type ActivosView =
  | { type: "list"; ambienteId?: string; ambienteNombre?: string }
  | { type: "ficha"; activo: ActivoConUbicacion }
  | { type: "register"; initialCodigo?: string }
  | { type: "edit"; activo: ActivoConUbicacion };

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
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-muted to-primary/15 p-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-brand">{APP_NAME}</CardTitle>
          <CardDescription>{APP_CLIENT} — App de escritorio (Fase 3)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Inicie sesión con su cuenta corporativa de Google (rol Contador)
          </p>
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
          <Button type="button" className="w-full" disabled={loading} onClick={handleGoogleLogin}>
            {loading ? "Esperando Google…" : "Continuar con Google"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ConfigWarning() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md border-amber-300 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/30">
        <CardHeader>
          <CardTitle>Supabase no configurado</CardTitle>
          <CardDescription>
            Copie las variables a <code className="text-xs">apps/desktop/.env.local</code>
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function MainApp({ userId, email }: { userId: string; email: string }) {
  const online = useOnline();
  const { profile, loading: profileLoading, error: profileError } = useProfile(userId);
  const catalog = useCatalogSync(Boolean(profile), online);
  const {
    entidades,
    entidad,
    entidadId,
    setEntidadId,
    setEntidadesList,
    loading: entidadesLoading,
    error: entidadesError,
  } = useSelectedEntidad(Boolean(profile));
  const { pending, syncing, lastResult, syncNow } = useSyncQueue(Boolean(profile));
  const activosCache = useActivosCache(entidadId, Boolean(profile));

  const [mainNav, setMainNav] = useState<MainNav>("activos");
  const [activosView, setActivosView] = useState<ActivosView>({ type: "list" });
  const [printTarget, setPrintTarget] = useState<ActivoConUbicacion | null>(null);
  const [batchPrintTargets, setBatchPrintTargets] = useState<ActivoConUbicacion[] | null>(null);

  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Cargando perfil…</p>
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acceso no permitido</CardTitle>
            <CardDescription>{profileError ?? "Perfil no disponible"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => void signOut()}>
              Cerrar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  function goActivosList() {
    setActivosView({ type: "list" });
  }

  function handleNavChange(nav: MainNav) {
    setMainNav(nav);
    if (nav === "activos") {
      setActivosView({ type: "list" });
    }
  }

  function handleViewAmbientesFromEntidad(id: string) {
    setEntidadId(id);
    setMainNav("ambientes");
    setActivosView({ type: "list" });
  }

  async function handleActivoUpdated(activo: ActivoConUbicacion) {
    if (activosView.type === "ficha" || activosView.type === "edit") {
      setActivosView({ type: "ficha", activo });
    }
    await activosCache.refresh();
  }

  let subheader: AppSubheader | undefined;

  if (mainNav === "activos") {
    if (activosView.type === "ficha") {
      subheader = {
        title: "Ficha del activo",
        subtitle: activosView.activo.nombre,
        onBack: goActivosList,
      };
    } else if (activosView.type === "register") {
      subheader = { title: "Registrar activo", onBack: goActivosList };
    } else if (activosView.type === "edit") {
      subheader = {
        title: "Editar activo",
        subtitle: activosView.activo.nombre,
        onBack: () => setActivosView({ type: "ficha", activo: activosView.activo }),
        backLabel: "Volver a ficha",
      };
    }
  }

  return (
    <AppShell
      activeNav={mainNav}
      onNavChange={handleNavChange}
      subheader={subheader}
      online={online}
      pendingSync={pending}
      syncing={syncing}
      userEmail={email}
    >
      {mainNav === "activos" && activosView.type === "list" && (
        <DashboardView
          entidades={entidades}
          entidadId={entidadId}
          ambienteFilter={
            activosView.ambienteId && activosView.ambienteNombre
              ? { id: activosView.ambienteId, nombre: activosView.ambienteNombre }
              : undefined
          }
          onClearAmbienteFilter={() => setActivosView({ type: "list" })}
          onEntidadChange={setEntidadId}
          entidadesLoading={entidadesLoading}
          entidadesError={entidadesError}
          catalog={catalog}
          catalogSyncing={catalog.syncing}
          onSyncCatalog={() => void catalog.syncNow()}
          online={online}
          activos={activosCache.activos}
          activosLoading={activosCache.loading}
          cacheCount={activosCache.count}
          cacheUpdatedAt={activosCache.updatedAt}
          syncMessage={lastResult}
          onSyncNow={() => {
            void syncNow();
            void catalog.syncNow();
            void activosCache.refresh();
          }}
          syncing={syncing}
          onRegister={() => setActivosView({ type: "register" })}
          onOpenFicha={(activo) => setActivosView({ type: "ficha", activo })}
          onPrintLabel={setPrintTarget}
          onPrintBatch={setBatchPrintTargets}
          onActivoUpdated={(activo) => void handleActivoUpdated(activo)}
        />
      )}

      {mainNav === "activos" && activosView.type === "ficha" && entidad && entidadId && (
        <ActivoFichaView
          activo={activosView.activo}
          entidadId={entidadId}
          entidadNombre={entidad.nombre}
          online={online}
          onEdit={() => setActivosView({ type: "edit", activo: activosView.activo })}
          onActivoUpdated={(activo) => void handleActivoUpdated(activo)}
        />
      )}

      {mainNav === "activos" && activosView.type === "register" && entidadId && (
        <ActivoFormDesktop
          entidadId={entidadId}
          initialCatalogoCodigo={activosView.initialCodigo}
          onSuccess={(activo) => setActivosView({ type: "ficha", activo })}
          onCancel={goActivosList}
        />
      )}

      {mainNav === "activos" && activosView.type === "edit" && entidadId && (
        <ActivoFormDesktop
          entidadId={entidadId}
          activo={activosView.activo}
          onSuccess={(activo) => setActivosView({ type: "ficha", activo })}
          onCancel={() => setActivosView({ type: "ficha", activo: activosView.activo })}
        />
      )}

      {mainNav === "ambientes" && entidad && (
        <AmbientesView
          entidades={entidades}
          entidad={entidad}
          entidadId={entidadId}
          onEntidadChange={setEntidadId}
          online={online}
          onViewActivos={(amb) => {
            setMainNav("activos");
            setActivosView({
              type: "list",
              ambienteId: amb.id,
              ambienteNombre: amb.nombre,
            });
          }}
        />
      )}

      {mainNav === "ambientes" && !entidad && (
        <div className="space-y-4 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-8">
          <p className="text-center font-medium text-muted-foreground">
            Seleccione la entidad cuyos ambientes desea gestionar.
          </p>
          <select
            className="mx-auto flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={entidadId}
            disabled={entidadesLoading || entidades.length === 0}
            onChange={(e) => setEntidadId(e.target.value)}
          >
            <option value="">Seleccione una entidad…</option>
            {entidades.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
          {entidadesError && <p className="text-center text-sm text-destructive">{entidadesError}</p>}
        </div>
      )}

      {mainNav === "entidad" && (
        <EntidadesView
          entidades={entidades}
          online={online}
          onEntidadesChange={setEntidadesList}
          onViewAmbientes={handleViewAmbientesFromEntidad}
        />
      )}

      {mainNav === "usuarios" && <UsuariosView />}

      {printTarget?.codigo_barras && entidad && (
        <PrintLabelDialog
          open
          onClose={() => setPrintTarget(null)}
          entidadNombre={entidad.nombre}
          codigoBarras={printTarget.codigo_barras}
          nombreBien={printTarget.nombre}
        />
      )}

      {batchPrintTargets && batchPrintTargets.length > 0 && entidad && (
        <PrintBatchLabelDialog
          open
          onClose={() => setBatchPrintTargets(null)}
          entidadNombre={entidad.nombre}
          items={batchPrintTargets.map((a) => ({
            codigoBarras: a.codigo_barras!,
            nombreBien: a.nombre,
          }))}
        />
      )}
    </AppShell>
  );
}

export default function App() {
  const { user, loading, configured } = useAuth();

  if (!configured) return <ConfigWarning />;
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Cargando…</p>
      </div>
    );
  }
  if (!user) return <LoginForm />;
  return <MainApp userId={user.id} email={user.email ?? ""} />;
}
