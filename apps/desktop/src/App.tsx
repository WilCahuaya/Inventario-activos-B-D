import { useEffect, useState, useCallback } from "react";
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
import { buildAmbienteContextBreadcrumbs } from "./lib/ambiente-context-breadcrumbs";
import { ActivoFormDesktop } from "./components/ActivoFormDesktop";
import { ActivoEditWithScopeDesktop } from "./components/ActivoEditWithScopeDesktop";
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
import { useActivosRealtime } from "./hooks/useActivosRealtime";
import type { ActivoConUbicacion } from "./lib/activos";
import { labelZplInputForActivo, labelZplInputsForActivos } from "./lib/label-print";
import { desktopNavSections } from "./lib/panel-nav";

type AmbienteContext = {
  entidadId: string;
  ambienteId: string;
  sedeId: string;
  sedeNombre?: string | null;
  ambienteNombre: string;
  ambienteResponsable?: string | null;
  ambienteResponsableId?: string | null;
  esAmbientePreregistro?: boolean;
};

type EntidadesFlow =
  | { type: "list" }
  | {
      type: "ambientes";
      entidadId: string;
      initialTab?: "ambientes" | "responsables" | "sucursales";
      sedeFocus?: { id: string; nombre: string };
    }
  | { type: "activos"; context: AmbienteContext }
  | { type: "register"; context: AmbienteContext; initialCodigo?: string }
  | { type: "edit"; activo: ActivoConUbicacion; context: AmbienteContext };

type InventarioFlow =
  | { type: "list" }
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

  const refreshActivos = useCallback(async () => {
    await activosCache.refresh();
    await globalActivos.refresh();
  }, [activosCache.refresh, globalActivos.refresh]);

  useActivosRealtime({
    enabled: Boolean(profile) && online,
    entidadId: profile?.rol === "ADMIN_ENTIDAD" ? profile.entidad_id : null,
    onRefresh: refreshActivos,
  });

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

  function goSedeAmbientes(entidadIdTarget: string, sedeId: string, sedeNombre: string) {
    setEntidadId(entidadIdTarget);
    setEntidadesFlow({
      type: "ambientes",
      entidadId: entidadIdTarget,
      sedeFocus: { id: sedeId, nombre: sedeNombre },
    });
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

  function goAmbienteFromActivo(activo: ActivoConUbicacion) {
    if (!activo.ambiente_id || !activo.sede_id) return;
    setMainNav("entidades");
    goActivosAmbiente({
      entidadId: activo.entidad_id,
      ambienteId: activo.ambiente_id,
      sedeId: activo.sede_id,
      sedeNombre: activo.sede_nombre,
      ambienteNombre: activo.ambiente_nombre ?? "Ambiente",
    });
  }

  function goAmbienteDestino(destino: {
    entidadId: string;
    sedeId: string;
    ambienteId: string;
    sedeNombre?: string | null;
    ambienteNombre: string;
  }) {
    setMainNav("entidades");
    goActivosAmbiente({
      entidadId: destino.entidadId,
      ambienteId: destino.ambienteId,
      sedeId: destino.sedeId,
      sedeNombre: destino.sedeNombre,
      ambienteNombre: destino.ambienteNombre,
    });
    void refreshActivos();
  }

  async function handleActivoUpdated(_activo: ActivoConUbicacion) {
    if (entidadesFlow.type === "edit") {
      setEntidadesFlow({ type: "activos", context: entidadesFlow.context });
    } else if (inventarioFlow.type === "edit") {
      setInventarioFlow({ type: "list" });
    }
    await refreshActivos();
  }

  async function handleSyncNow() {
    void syncNow();
    void catalog.syncNow();
    await refreshActivos();
  }

  const drillEntidad = entidades.find((e) => e.id === drillEntidadId) ?? entidad;

  function navigateAmbienteFromContext(
    context: AmbienteContext,
    ambienteId: string,
    ambienteNombre: string,
  ) {
    if (ambienteId === context.ambienteId) return;
    goActivosAmbiente({
      ...context,
      ambienteId,
      ambienteNombre,
    });
  }

  const sedeBreadcrumbLink = (context: AmbienteContext) =>
    context.sedeId && context.sedeNombre?.trim()
      ? {
          onClick: () =>
            goSedeAmbientes(context.entidadId, context.sedeId, context.sedeNombre!.trim()),
        }
      : undefined;

  let subheader: AppSubheader | undefined;

  if (mainNav === "entidades") {
    if (entidadesFlow.type === "ambientes" && drillEntidad) {
      subheader = entidadesFlow.sedeFocus
        ? {
            breadcrumbs: [
              { label: "Entidades", onClick: goEntidadesList },
              {
                label: drillEntidad.nombre,
                onClick: () => goAmbientes(entidadesFlow.entidadId),
              },
              { label: entidadesFlow.sedeFocus.nombre },
            ],
            subtitle: `Ambientes de la sucursal · ${entidadesFlow.sedeFocus.nombre}`,
          }
        : {
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
        breadcrumbs: buildAmbienteContextBreadcrumbs({
          entidadLabel: drillEntidad?.nombre ?? "Entidad",
          onEntidadClick: () => goAmbientes(entidadesFlow.context.entidadId),
          context: entidadesFlow.context,
          sedeLink: sedeBreadcrumbLink(entidadesFlow.context),
          onAmbienteNavigate: (ambienteId, ambienteNombre) =>
            navigateAmbienteFromContext(entidadesFlow.context, ambienteId, ambienteNombre),
        }),
        subtitle: entidadesFlow.context.ambienteResponsable
          ? `Responsable: ${entidadesFlow.context.ambienteResponsable}`
          : undefined,
      };
    } else if (entidadesFlow.type === "register") {
      subheader = {
        breadcrumbs: buildAmbienteContextBreadcrumbs({
          entidadLabel: drillEntidad?.nombre ?? "Entidad",
          onEntidadClick: () => goAmbientes(entidadesFlow.context.entidadId),
          context: entidadesFlow.context,
          sedeLink: sedeBreadcrumbLink(entidadesFlow.context),
          trailing: [{ label: "Crear activo" }],
          onAmbienteNavigate: (ambienteId, ambienteNombre) => {
            if (ambienteId === entidadesFlow.context.ambienteId) return;
            setEntidadesFlow({
              type: "register",
              context: { ...entidadesFlow.context, ambienteId, ambienteNombre },
              initialCodigo: entidadesFlow.initialCodigo,
            });
          },
        }),
      };
    } else if (entidadesFlow.type === "edit") {
      subheader = {
        breadcrumbs: buildAmbienteContextBreadcrumbs({
          entidadLabel: drillEntidad?.nombre ?? "Entidad",
          onEntidadClick: () => goAmbientes(entidadesFlow.context.entidadId),
          context: entidadesFlow.context,
          sedeLink: sedeBreadcrumbLink(entidadesFlow.context),
          trailing: [
            {
              label: entidadesFlow.activo.nombre,
              onClick: () => goActivosListFromContext(entidadesFlow.context),
            },
            { label: "Editar activo" },
          ],
          onAmbienteNavigate: (ambienteId, ambienteNombre) => {
            if (ambienteId === entidadesFlow.context.ambienteId) return;
            setEntidadesFlow({
              type: "edit",
              activo: entidadesFlow.activo,
              context: { ...entidadesFlow.context, ambienteId, ambienteNombre },
            });
          },
        }),
      };
    }
  } else if (mainNav === "inventario") {
    if (inventarioFlow.type === "edit") {
      subheader = {
        breadcrumbs: [
          { label: "Inventario global", onClick: () => setInventarioFlow({ type: "list" }) },
          { label: inventarioFlow.activo.nombre },
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
          sedeFocus={entidadesFlow.sedeFocus}
          drillDown
          online={online}
          onViewActivos={(amb) =>
            goActivosAmbiente({
              entidadId: entidadesFlow.entidadId,
              ambienteId: amb.id,
              sedeId: amb.sede_id,
              sedeNombre: amb.sede_nombre,
              ambienteNombre: amb.nombre,
              ambienteResponsable: amb.responsable,
              ambienteResponsableId: amb.responsable_id,
              esAmbientePreregistro: amb.es_preregistro,
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
            ambienteResponsableId={entidadesFlow.context.ambienteResponsableId}
            sedeId={entidadesFlow.context.sedeId}
            sedeNombre={entidadesFlow.context.sedeNombre}
            esAmbientePreregistro={entidadesFlow.context.esAmbientePreregistro}
            activos={activosCache.activos}
            loading={activosCache.loading}
            online={online}
            usuarioNombre={profile.nombre}
            usuarioEmail={profile.email}
            onRegister={() =>
              setEntidadesFlow({ type: "register", context: entidadesFlow.context })
            }
            onPrintLabel={setPrintTarget}
            onPrintBatch={setBatchPrintTargets}
            onEditActivo={(activo) =>
              setEntidadesFlow({
                type: "edit",
                activo,
                context: entidadesFlow.context,
              })
            }
            onActivoUpdated={(activo) => void handleActivoUpdated(activo)}
            onAbrirAmbienteDestino={goAmbienteDestino}
          />
        )}

      {mainNav === "entidades" && entidadesFlow.type === "register" && activosEntidadId && (
        <ActivoFormDesktop
          entidadId={activosEntidadId}
          entidadNombre={drillEntidad?.nombre ?? ""}
          entidadNombreEtiqueta={drillEntidad?.nombre_etiqueta}
          fixedSedeId={
            entidadesFlow.context.esAmbientePreregistro
              ? undefined
              : entidadesFlow.context.sedeId
          }
          fixedAmbienteId={
            entidadesFlow.context.esAmbientePreregistro
              ? undefined
              : entidadesFlow.context.ambienteId
          }
          modoPreregistro={entidadesFlow.context.esAmbientePreregistro}
          initialCatalogoCodigo={entidadesFlow.initialCodigo}
          onAddCatalogoMissing={openCatalogoFromSearch}
          onSuccess={() => goActivosListFromContext(entidadesFlow.context)}
          onCancel={() => goActivosListFromContext(entidadesFlow.context)}
        />
      )}

      {mainNav === "entidades" && entidadesFlow.type === "edit" && activosEntidadId && (
        <ActivoEditWithScopeDesktop
          entidadId={activosEntidadId}
          entidadNombre={drillEntidad?.nombre ?? ""}
          entidadNombreEtiqueta={drillEntidad?.nombre_etiqueta}
          fixedSedeId={entidadesFlow.context.sedeId}
          fixedAmbienteId={entidadesFlow.context.ambienteId}
          activo={entidadesFlow.activo}
          onAddCatalogoMissing={openCatalogoFromSearch}
          onSuccess={() => goActivosListFromContext(entidadesFlow.context)}
          onCancel={() => goActivosListFromContext(entidadesFlow.context)}
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
          onPrintLabel={setPrintTarget}
          onPrintBatch={setBatchPrintTargets}
          onEditActivo={(activo) => setInventarioFlow({ type: "edit", activo })}
          onIrAmbiente={goAmbienteFromActivo}
          onAbrirAmbienteDestino={goAmbienteDestino}
          onActivoUpdated={(activo) => void handleActivoUpdated(activo)}
        />
      )}

      {mainNav === "inventario" && inventarioFlow.type === "edit" && (
        <ActivoEditWithScopeDesktop
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
          onSuccess={() => setInventarioFlow({ type: "list" })}
          onCancel={() => setInventarioFlow({ type: "list" })}
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
