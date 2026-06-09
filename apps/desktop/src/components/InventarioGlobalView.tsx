import type { Entidad } from "@inventario/types";
import { Button } from "@inventario/ui";
import type { ActivoConUbicacion } from "../lib/activos";
import type { CatalogSyncState } from "../hooks/useCatalogSync";
import { ActivosCampoList } from "./ActivosCampoList";

interface InventarioGlobalViewProps {
  entidades: Entidad[];
  activos: ActivoConUbicacion[];
  activosLoading: boolean;
  catalog: CatalogSyncState;
  catalogSyncing: boolean;
  onSyncCatalog: () => void;
  online: boolean;
  syncMessage: string | null;
  onSyncNow: () => void;
  syncing: boolean;
  onOpenFicha: (activo: ActivoConUbicacion) => void;
  onPrintLabel: (activo: ActivoConUbicacion) => void;
  onPrintBatch?: (activos: ActivoConUbicacion[]) => void;
  onActivoUpdated: (activo: ActivoConUbicacion) => void;
}

function StatPill({
  label,
  value,
  title,
  onClick,
  disabled,
}: {
  label: string;
  value: string;
  title?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const className =
    "inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card px-2 py-1 text-xs whitespace-nowrap";

  if (onClick) {
    return (
      <button
        type="button"
        title={title}
        disabled={disabled}
        onClick={onClick}
        className={`${className} transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-primary">{value}</span>
      </button>
    );
  }

  return (
    <span className={className} title={title}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-primary">{value}</span>
    </span>
  );
}

export function InventarioGlobalView({
  entidades,
  activos,
  activosLoading,
  catalog,
  catalogSyncing,
  onSyncCatalog,
  online,
  syncMessage,
  onSyncNow,
  syncing,
  onOpenFicha,
  onPrintLabel,
  onPrintBatch,
  onActivoUpdated,
}: InventarioGlobalViewProps) {
  const registradosCount = activos.filter((a) => a.estado_registro === "REGISTRADO").length;
  const preregistradosCount = activos.filter((a) => a.estado_registro === "PREREGISTRADO").length;
  const bajaCount = activos.filter((a) => a.estado_registro === "DADO_DE_BAJA").length;

  return (
    <div className="space-y-2">
      <div className="shrink-0 space-y-2 rounded-lg border border-border/60 bg-card px-3 py-2 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium text-foreground">Inventario global</p>
            <p className="text-xs text-muted-foreground">
              Todos los activos de todas las entidades. Valide preregistros desde aquí.
            </p>
          </div>
          {online && (
            <Button type="button" size="sm" variant="outline" disabled={syncing} onClick={onSyncNow}>
              {syncing ? "Sync…" : "Sincronizar"}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-2">
          <StatPill label="Registrados" value={registradosCount.toLocaleString("es-PE")} />
          <StatPill label="Preregistrados" value={preregistradosCount.toLocaleString("es-PE")} />
          <StatPill label="Dados de baja" value={bajaCount.toLocaleString("es-PE")} />
          <StatPill
            label="Catálogo"
            value={catalogSyncing ? "…" : catalog.count.toLocaleString("es-PE")}
            title={
              catalog.error
                ? catalog.error
                : catalog.syncedAt
                  ? `Última sync: ${new Date(catalog.syncedAt).toLocaleString("es-PE")}`
                  : "Sincronizar catálogo nacional"
            }
            onClick={onSyncCatalog}
            disabled={!online || catalogSyncing}
          />
          {activosLoading && (
            <span className="text-xs text-muted-foreground">Actualizando lista…</span>
          )}
        </div>

        {!online && (
          <p className="border-t border-amber-500/20 pt-2 text-xs text-amber-800 dark:text-amber-200">
            Sin conexión: se muestra la caché local agregada de todas las entidades.
          </p>
        )}

        {syncMessage && (
          <p className="border-t border-border/40 pt-2 text-xs text-primary">{syncMessage}</p>
        )}
      </div>

      <ActivosCampoList
        variant="global"
        entidades={entidades}
        entidadId=""
        activos={activos}
        loading={activosLoading}
        online={online}
        onOpenFicha={onOpenFicha}
        onPrintLabel={onPrintLabel}
        onPrintBatch={onPrintBatch}
        onActivoUpdated={onActivoUpdated}
      />
    </div>
  );
}
