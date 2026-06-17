import { useEffect, useState } from "react";
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
import { ActivosAmbienteView } from "./components/ActivosAmbienteView";
import { AmbientesView } from "./components/AmbientesView";
import { AppShell, type AppSubheader, type MainNav } from "./components/AppShell";
import { EntidadesView } from "./components/EntidadesView";
import { InventarioGlobalView } from "./components/InventarioGlobalView";
import { PrintBatchLabelDialog } from "./components/PrintBatchLabelDialog";
import { PrintLabelDialog } from "./components/PrintLabelDialog";
import { CatalogoView } from "./components/CatalogoView";
import { ReportesView } from "./components/ReportesView";
import { UsuariosView } from "./components/UsuariosView";
import { LoginDebugPanel } from "./components/LoginDebugPanel";
import { type AuthLoginDebug, signInWithGoogle, signOut, useAuth } from "./hooks/useAuth";
import { getAuthCallbackUrl } from "./lib/auth-config";
import { useActivosCache } from "./hooks/useActivosCache";
import { useAtributoVocabSync } from "./hooks/useAtributoVocabSync";
import { useCatalogSync } from "./hooks/useCatalogSync";
import { useGlobalActivosCache } from "./hooks/useGlobalActivosCache";
import { useOnline } from "./hooks/useOnline";
import { useProfile } from "./hooks/useProfile";
import { useSelectedEntidad } from "./hooks/useSelectedEntidad";
import { useSyncQueue } from "./hooks/useSyncQueue";
import type { ActivoConUbicacion } from "./lib/activos";
import { labelZplInputForActivo, labelZplInputsForActivos } from "./lib/label-print";
import { desktopNavSections } from "./lib/panel-nav";

type AmbienteContext = {
  entidadId: string;
  ambienteId: string;
  sedeId: string;
  ambienteNombre: string;
  ambienteResponsable?: string | null;
};

type EntidadesFlow =
  | { type: "list" }
  | {
      type: "ambientes";
      entidadId: string;
      initialTab?: "ambientes" | "responsables" | "sucursales";
    }
  | { type: "activos"; context: AmbienteContext }
  | { type: "ficha"; activo: ActivoConUbicacion; context: AmbienteContext }
  | { type: "register"; context: AmbienteContext; initialCodigo?: string }
  | { type: "edit"; activo: ActivoConUbicacion; context: AmbienteContext };

type InventarioFlow =
  | { type: "list" }
  | { type: "ficha"; activo: ActivoConUbicacion }
  | { type: "edit"; activo: ActivoConUbicacion };

function entidadIdFromFlow(flow: EntidadesFlow): string {
  if (flow.type === "list") return "";
  if (flow.type === "ambientes") return flow.entidadId;
  return flow.context.entidadId;
}

function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<AuthLoginDebug | null>(null);
  const [showDebugOnError, setShowDebugOnError] = useState(false);

  useEffect(() => {
    if (window.location.protocol !== "file:") return;
    if (window.electronAPI?.platform) return;
    setError(
      "La app no detectó el módulo de escritorio. Abra «Inventario Activos B&D.exe» desde el menú Inicio (no abra index.html). Si ya lo hizo, reinstale con el instalador más reciente.",
    );
  }, []);

  useEffect(() => {
    if (!window.electronAPI?.getAuthDiagnostics) return;
    void window.electronAPI.getAuthDiagnostics().then((diag) => {
      setDebug({
        callbackUrl: getAuthCallbackUrl(),
        oauthRedirectBefore: null,
        oauthRedirectAfter: null,
        oauthUrlPreview: null,
        oauthUrlKind: null,
        redirectPatched: false,
        serverOk: diag.ok,
        status: null,
      });
    });
  }, []);

  async function handleGoogleLogin() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const onDebug = (partial: AuthLoginDebug) => setDebug(partial);
      const { error: authError, debug: loginDebug } = await signInWithGoogle(onDebug);
      if (loginDebug) setDebug(loginDebug);
      if (authError) {
        setError(authError.message || "No se pudo iniciar sesión con Google.");
        setShowDebugOnError(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado al iniciar sesión.");
      setShowDebugOnError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-start bg-gradient-to-br from-background via-muted to-primary/15 px-6 pb-8 pt-12 sm:pt-16">
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
            Inicie sesión con su cuenta corporativa de Google (rol Contador). Se abrirá Chrome o
            Edge para completar el acceso.
          </p>
          {loading && (
            <p className="text-center text-sm text-muted-foreground">
              Se abrirá su navegador (Chrome o Edge). Complete el acceso allí y regrese a esta
              ventana.
            </p>
          )}
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
          <Button type="button" className="w-full" disabled={loading} onClick={handleGoogleLogin}>
            {loading ? "Esperando autorización en el navegador…" : "Continuar con Google"}
          </Button>
          <LoginDebugPanel debug={debug} forceVisible={showDebugOnError} />
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

function MainApp({ userId }: { userId: string; email: string }) {
  const online = useOnline();
  const { profile, loading: profileLoading, error: profileError } = useProfile(userId);
  const catalog = useCatalogSync(Boolean(profile), online);
  useAtributoVocabSync(Boolean(profile), online);
  const {
    entidades,
    entidad,
    entidadId,
    setEntidadId,
    setEntidadesList,
  } = useSelectedEntidad(Boolean(profile));
  const { pending, syncing, lastResult, syncNow } = useSyncQueue(Boolean(profile));

  const [mainNav, setMainNav] = useState<MainNav>("entidades");
  const [entidadesFlow, setEntidadesFlow] = useState<EntidadesFlow>({ type: "list" });
  const [inventarioFlow, setInventarioFlow] = useState<InventarioFlow>({ type: "list" });
  const [printTarget, setPrintTarget] = useState<ActivoConUbicacion | null>(null);
  const [batchPrintTargets, setBatchPrintTargets] = useState<ActivoConUbicacion[] | null>(null);
  const [catalogoPrefillDenominacion, setCatalogoPrefillDenominacion] = useState("");

  function openCatalogoFromSearch(query: string) {
    setCatalogoPrefillDenominacion(query);
    setMainNav("catalogo");
  }

  const drillEntidadId = entidadIdFromFlow(entidadesFlow);
  const activosEntidadId = drillEntidadId || entidadId;

  const activosCache = useActivosCache(activosEntidadId, Boolean(profile) && Boolean(activosEntidadId));
  const globalActivos = useGlobalActivosCache(entidades, Boolean(profile));

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

  function handleNavChange(nav: MainNav) {
    setMainNav(nav);
    if (nav === "entidades") {
      setEntidadesFlow({ type: "list" });
    } else if (nav === "inventario") {
      setInventarioFlow({ type: "list" });
    } else if (nav === "catalogo") {
      setCatalogoPrefillDenominacion("");
    }
  }

  function goEntidadesList() {
    setEntidadesFlow({ type: "list" });
  }

  function goAmbientes(entidadIdTarget: string) {
    setEntidadId(entidadIdTarget);
    setEntidadesFlow({ type: "ambientes", entidadId: entidadIdTarget });
  }

  function goResponsables(entidadIdTarget: string) {
    setEntidadId(entidadIdTarget);
    setEntidadesFlow({
      type: "ambientes",
      entidadId: entidadIdTarget,
      initialTab: "responsables",
    });
  }

  function goActivosAmbiente(context: AmbienteContext) {
    setEntidadId(context.entidadId);
    setEntidadesFlow({ type: "activos", context });
  }

  function goActivosListFromContext(context: AmbienteContext) {
    setEntidadesFlow({ type: "activos", context });
  }

  async function refreshActivos() {
    await activosCache.refresh();
    await globalActivos.refresh();
  }

  async function handleActivoUpdated(activo: ActivoConUbicacion) {
    if (entidadesFlow.type === "ficha" || entidadesFlow.type === "edit") {
      setEntidadesFlow({ type: "ficha", activo, context: entidadesFlow.context });
    } else if (inventarioFlow.type === "ficha" || inventarioFlow.type === "edit") {
      setInventarioFlow({ type: "ficha", activo });
    }
    await refreshActivos();
  }

  async function handleSyncNow() {
    void syncNow();
    void catalog.syncNow();
    await refreshActivos();
  }

  const drillEntidad = entidades.find((e) => e.id === drillEntidadId) ?? entidad;

  let subheader: AppSubheader | undefined;

  if (mainNav === "entidades") {
    if (entidadesFlow.type === "ambientes" && drillEntidad) {
      subheader = {
        breadcrumbs: [
          { label: "Entidades", onClick: goEntidadesList },
          { label: drillEntidad.nombre },
        ],
        subtitle: drillEntidad.ruc
          ? `RUC ${drillEntidad.ruc} · Ambientes, responsables y sucursales`
          : "Ambientes, responsables y sucursales",
      };
    } else if (entidadesFlow.type === "activos") {
      subheader = {
        breadcrumbs: [
          {
            label: drillEntidad?.nombre ?? "Entidad",
            onClick: () => goAmbientes(entidadesFlow.context.entidadId),
          },
          { label: entidadesFlow.context.ambienteNombre },
        ],
        subtitle: entidadesFlow.context.ambienteResponsable
          ? `Responsable: ${entidadesFlow.context.ambienteResponsable}`
          : undefined,
      };
    } else if (entidadesFlow.type === "ficha") {
      subheader = {
        breadcrumbs: [
          {
            label: drillEntidad?.nombre ?? "Entidad",
            onClick: () => goAmbientes(entidadesFlow.context.entidadId),
          },
          {
            label: entidadesFlow.context.ambienteNombre,
            onClick: () => goActivosListFromContext(entidadesFlow.context),
          },
          { label: entidadesFlow.activo.nombre },
        ],
      };
    } else if (entidadesFlow.type === "register") {
      subheader = {
        breadcrumbs: [
          {
            label: drillEntidad?.nombre ?? "Entidad",
            onClick: () => goAmbientes(entidadesFlow.context.entidadId),
          },
          {
            label: entidadesFlow.context.ambienteNombre,
            onClick: () => goActivosListFromContext(entidadesFlow.context),
          },
          { label: "Crear activo" },
        ],
      };
    } else if (entidadesFlow.type === "edit") {
      subheader = {
        breadcrumbs: [
          {
            label: drillEntidad?.nombre ?? "Entidad",
            onClick: () => goAmbientes(entidadesFlow.context.entidadId),
          },
          {
            label: entidadesFlow.context.ambienteNombre,
            onClick: () => goActivosListFromContext(entidadesFlow.context),
          },
          {
            label: entidadesFlow.activo.nombre,
            onClick: () =>
              setEntidadesFlow({
                type: "ficha",
                activo: entidadesFlow.activo,
                context: entidadesFlow.context,
              }),
          },
          { label: "Editar activo" },
        ],
      };
    }
  } else if (mainNav === "inventario") {
    if (inventarioFlow.type === "ficha") {
      subheader = {
        breadcrumbs: [
          { label: "Inventario global", onClick: () => setInventarioFlow({ type: "list" }) },
          { label: inventarioFlow.activo.nombre },
        ],
      };
    } else if (inventarioFlow.type === "edit") {
      subheader = {
        breadcrumbs: [
          { label: "Inventario global", onClick: () => setInventarioFlow({ type: "list" }) },
          {
            label: inventarioFlow.activo.nombre,
            onClick: () => setInventarioFlow({ type: "ficha", activo: inventarioFlow.activo }),
          },
          { label: "Editar activo" },
        ],
      };
    }
  }

  function entidadForActivo(activo: ActivoConUbicacion) {
    return entidades.find((e) => e.id === activo.entidad_id);
  }

  const preregistrados = globalActivos.activos.filter(
    (a) => a.estado_registro === "PREREGISTRADO",
  ).length;

  return (
    <AppShell
      activeNav={mainNav}
      onNavChange={handleNavChange}
      navSections={desktopNavSections(preregistrados)}
      subheader={subheader}
      online={online}
      pendingSync={pending}
      syncing={syncing}
      user={{ nombre: profile.nombre, email: profile.email }}
    >
      {mainNav === "entidades" && entidadesFlow.type === "list" && (
        <EntidadesView
          entidades={entidades}
          online={online}
          onEntidadesChange={setEntidadesList}
          onViewAmbientes={goAmbientes}
          onViewResponsables={goResponsables}
        />
      )}

      {mainNav === "entidades" && entidadesFlow.type === "ambientes" && drillEntidad && (
        <AmbientesView
          entidades={entidades}
          entidad={drillEntidad}
          entidadId={entidadesFlow.entidadId}
          initialTab={entidadesFlow.initialTab}
          drillDown
          online={online}
          onViewActivos={(amb) =>
            goActivosAmbiente({
              entidadId: entidadesFlow.entidadId,
              ambienteId: amb.id,
              sedeId: amb.sede_id,
              ambienteNombre: amb.nombre,
              ambienteResponsable: amb.responsable,
            })
          }
        />
      )}

      {mainNav === "entidades" &&
        entidadesFlow.type === "activos" &&
        drillEntidad &&
        activosEntidadId && (
          <ActivosAmbienteView
            entidad={drillEntidad}
            ambienteId={entidadesFlow.context.ambienteId}
            ambienteNombre={entidadesFlow.context.ambienteNombre}
            ambienteResponsable={entidadesFlow.context.ambienteResponsable}
            sedeId={entidadesFlow.context.sedeId}
            activos={activosCache.activos}
            loading={activosCache.loading}
            online={online}
            usuarioNombre={profile.nombre}
            usuarioEmail={profile.email}
            onRegister={() =>
              setEntidadesFlow({ type: "register", context: entidadesFlow.context })
            }
            onOpenFicha={(activo) =>
              setEntidadesFlow({ type: "ficha", activo, context: entidadesFlow.context })
            }
            onPrintLabel={setPrintTarget}
            onPrintBatch={setBatchPrintTargets}
            onActivoUpdated={(activo) => void handleActivoUpdated(activo)}
          />
        )}

      {mainNav === "entidades" && entidadesFlow.type === "ficha" && activosEntidadId && (
        <ActivoFichaView
          activo={entidadesFlow.activo}
          entidadId={activosEntidadId}
          entidadNombre={drillEntidad?.nombre ?? ""}
          entidadNombreEtiqueta={drillEntidad?.nombre_etiqueta}
          online={online}
          onEdit={() =>
            setEntidadesFlow({
              type: "edit",
              activo: entidadesFlow.activo,
              context: entidadesFlow.context,
            })
          }
          onActivoUpdated={(activo) => void handleActivoUpdated(activo)}
          onPrintBatch={setBatchPrintTargets}
        />
      )}

      {mainNav === "entidades" && entidadesFlow.type === "register" && activosEntidadId && (
        <ActivoFormDesktop
          entidadId={activosEntidadId}
          entidadNombre={drillEntidad?.nombre ?? ""}
          entidadNombreEtiqueta={drillEntidad?.nombre_etiqueta}
          fixedSedeId={entidadesFlow.context.sedeId}
          fixedAmbienteId={entidadesFlow.context.ambienteId}
          initialCatalogoCodigo={entidadesFlow.initialCodigo}
          onAddCatalogoMissing={openCatalogoFromSearch}
          onSuccess={(activo) =>
            setEntidadesFlow({ type: "ficha", activo, context: entidadesFlow.context })
          }
          onCancel={() => goActivosListFromContext(entidadesFlow.context)}
        />
      )}

      {mainNav === "entidades" && entidadesFlow.type === "edit" && activosEntidadId && (
        <ActivoFormDesktop
          entidadId={activosEntidadId}
          entidadNombre={drillEntidad?.nombre ?? ""}
          entidadNombreEtiqueta={drillEntidad?.nombre_etiqueta}
          fixedSedeId={entidadesFlow.context.sedeId}
          fixedAmbienteId={entidadesFlow.context.ambienteId}
          activo={entidadesFlow.activo}
          onAddCatalogoMissing={openCatalogoFromSearch}
          onSuccess={(activo) =>
            setEntidadesFlow({ type: "ficha", activo, context: entidadesFlow.context })
          }
          onCancel={() =>
            setEntidadesFlow({
              type: "ficha",
              activo: entidadesFlow.activo,
              context: entidadesFlow.context,
            })
          }
        />
      )}

      {mainNav === "inventario" && inventarioFlow.type === "list" && (
        <InventarioGlobalView
          entidades={entidades}
          activos={globalActivos.activos}
          activosLoading={globalActivos.loading}
          catalog={catalog}
          catalogSyncing={catalog.syncing}
          onSyncCatalog={() => void catalog.syncNow()}
          online={online}
          syncMessage={lastResult}
          onSyncNow={() => void handleSyncNow()}
          syncing={syncing}
          usuarioNombre={profile.nombre}
          usuarioEmail={profile.email}
          onOpenFicha={(activo) => setInventarioFlow({ type: "ficha", activo })}
          onPrintLabel={setPrintTarget}
          onPrintBatch={setBatchPrintTargets}
          onActivoUpdated={(activo) => void handleActivoUpdated(activo)}
          onActivosImported={() => void refreshActivos()}
        />
      )}

      {mainNav === "inventario" && inventarioFlow.type === "ficha" && (
        <ActivoFichaView
          activo={inventarioFlow.activo}
          entidadId={inventarioFlow.activo.entidad_id}
          entidadNombre={
            entidadForActivo(inventarioFlow.activo)?.nombre ??
            inventarioFlow.activo.entidad_nombre ??
            ""
          }
          entidadNombreEtiqueta={entidadForActivo(inventarioFlow.activo)?.nombre_etiqueta}
          online={online}
          onEdit={() => setInventarioFlow({ type: "edit", activo: inventarioFlow.activo })}
          onActivoUpdated={(activo) => void handleActivoUpdated(activo)}
          onPrintBatch={setBatchPrintTargets}
        />
      )}

      {mainNav === "inventario" && inventarioFlow.type === "edit" && (
        <ActivoFormDesktop
          entidadId={inventarioFlow.activo.entidad_id}
          entidadNombre={
            entidadForActivo(inventarioFlow.activo)?.nombre ??
            inventarioFlow.activo.entidad_nombre ??
            ""
          }
          entidadNombreEtiqueta={entidadForActivo(inventarioFlow.activo)?.nombre_etiqueta}
          fixedSedeId={inventarioFlow.activo.sede_id ?? undefined}
          fixedAmbienteId={inventarioFlow.activo.ambiente_id ?? undefined}
          activo={inventarioFlow.activo}
          onAddCatalogoMissing={openCatalogoFromSearch}
          onSuccess={(activo) => setInventarioFlow({ type: "ficha", activo })}
          onCancel={() => setInventarioFlow({ type: "ficha", activo: inventarioFlow.activo })}
        />
      )}

      {mainNav === "catalogo" && (
        <CatalogoView initialDenominacion={catalogoPrefillDenominacion} />
      )}

      {mainNav === "usuarios" && <UsuariosView />}

      {mainNav === "reportes" && (
        <ReportesView
          entidades={entidades}
          usuarioNombre={profile.nombre}
          usuarioEmail={profile.email}
          online={online}
        />
      )}

      {printTarget?.codigo_barras && (
        <PrintLabelDialog
          open
          onClose={() => setPrintTarget(null)}
          label={labelZplInputForActivo(printTarget, entidadForActivo(printTarget) ?? entidad)}
        />
      )}

      {batchPrintTargets && batchPrintTargets.length > 0 && (
        <PrintBatchLabelDialog
          open
          onClose={() => setBatchPrintTargets(null)}
          labels={labelZplInputsForActivos(
            batchPrintTargets,
            entidadForActivo(batchPrintTargets[0]) ?? entidad,
          )}
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
