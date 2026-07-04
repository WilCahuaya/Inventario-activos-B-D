"use client";

import { useEffect, useState } from "react";
import type {
  CatalogoNacional,
  CatalogoCampoOpciones,
  CatalogoOpcionTipo,
  CreateCatalogoNacionalInput,
  CuentaContable,
  UpdateCatalogoPropioInput,
  UpdateCatalogoNacionalContabilidadInput,
  UpsertCuentaContableInput,
} from "@inventario/types";
import { Button } from "./components";
import { CatalogoAltaPanel } from "./catalogo-alta-panel";
import { CatalogoNacionalConsulta } from "./catalogo-nacional-consulta";
import { CatalogoPropioPanel } from "./catalogo-propio-panel";
import { CuentasContablesPanel } from "./cuentas-contables-panel";
import { PanelTabs } from "./panel";

type CatalogoTab = "propio" | "nacional" | "cuentas";

const CATALOGO_TABS: { id: CatalogoTab; label: string }[] = [
  { id: "propio", label: "Catálogo propio" },
  { id: "cuentas", label: "Cuentas contables" },
  { id: "nacional", label: "Consultar nacional" },
];

export interface CatalogoPageProps {
  initialDenominacion?: string;
  successSuffix?: string;
  offlineHint?: string;
  readOnlyPropio?: boolean;
  loadNextCodigo: () => Promise<string>;
  loadGrupos: () => Promise<CatalogoCampoOpciones>;
  loadClases: () => Promise<CatalogoCampoOpciones>;
  suggestGrupo: (denominacion: string) => Promise<string | null>;
  onRegisterOpcionPersonalizada?: (
    tipo: CatalogoOpcionTipo,
    valor: string,
  ) => Promise<{ error?: string } | void>;
  onDeleteOpcionPersonalizada?: (
    tipo: CatalogoOpcionTipo,
    valor: string,
  ) => Promise<{ error?: string } | void>;
  onCreate: (
    input: CreateCatalogoNacionalInput,
  ) => Promise<{ data?: CatalogoNacional; error?: string }>;
  listPropio: () => Promise<CatalogoNacional[]>;
  onUpdatePropio: (
    codigo: string,
    input: UpdateCatalogoPropioInput,
  ) => Promise<{ data?: CatalogoNacional; error?: string }>;
  onDeletePropio: (codigo: string) => Promise<{ error?: string }>;
  searchNacional: (query: string) => Promise<CatalogoNacional[]>;
  searchCuentasContables: (query: string) => Promise<CuentaContable[]>;
  listCuentasContables?: (query?: string) => Promise<CuentaContable[]>;
  onUpsertCuentaContable?: (
    input: UpsertCuentaContableInput,
  ) => Promise<{ data?: CuentaContable; error?: string }>;
  onDeleteCuentaContable?: (codigo: string) => Promise<{ error?: string }>;
  readOnlyCuentasContables?: boolean;
  onUpdateNacionalContabilidad?: (
    codigo: string,
    input: UpdateCatalogoNacionalContabilidadInput,
  ) => Promise<{ data?: CatalogoNacional; error?: string }>;
  readOnlyNacionalContabilidad?: boolean;
}

export function CatalogoPage({
  initialDenominacion = "",
  successSuffix,
  offlineHint,
  readOnlyPropio = false,
  loadNextCodigo,
  loadGrupos,
  loadClases,
  suggestGrupo,
  onRegisterOpcionPersonalizada,
  onDeleteOpcionPersonalizada,
  onCreate,
  listPropio,
  onUpdatePropio,
  onDeletePropio,
  searchNacional,
  searchCuentasContables,
  listCuentasContables,
  onUpsertCuentaContable,
  onDeleteCuentaContable,
  readOnlyCuentasContables = false,
  onUpdateNacionalContabilidad,
  readOnlyNacionalContabilidad = false,
}: CatalogoPageProps) {
  const [tab, setTab] = useState<CatalogoTab>("propio");
  const [propioReloadKey, setPropioReloadKey] = useState(0);
  const [cuentasReloadKey, setCuentasReloadKey] = useState(0);
  const [showAltaForm, setShowAltaForm] = useState(false);

  const listCuentas = listCuentasContables ?? ((query = "") => searchCuentasContables(query));

  useEffect(() => {
    if (initialDenominacion.trim()) {
      setShowAltaForm(true);
    }
  }, [initialDenominacion]);

  function handleItemCreated() {
    setPropioReloadKey((k) => k + 1);
    setCuentasReloadKey((k) => k + 1);
    setShowAltaForm(false);
  }

  async function handleUpsertCuenta(input: UpsertCuentaContableInput) {
    if (!onUpsertCuentaContable) {
      return { error: "No se puede guardar la cuenta contable." };
    }
    const result = await onUpsertCuentaContable(input);
    if (!result.error) {
      setCuentasReloadKey((k) => k + 1);
    }
    return result;
  }

  async function handleDeleteCuenta(codigo: string) {
    if (!onDeleteCuentaContable) {
      return { error: "No se puede eliminar la cuenta contable." };
    }
    const result = await onDeleteCuentaContable(codigo);
    if (!result.error) {
      setCuentasReloadKey((k) => k + 1);
    }
    return result;
  }

  return (
    <div className="space-y-6">
      <PanelTabs tabs={CATALOGO_TABS} value={tab} onChange={setTab} />

      {tab === "propio" ? (
        <div className="overflow-visible rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">Catálogo propio</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Bienes de cuenta de orden registrados por la entidad (códigos BD…). Puede ver,
                editar o eliminar si ningún activo los usa.
              </p>
            </div>
            {!readOnlyPropio && !showAltaForm && (
              <Button type="button" size="sm" onClick={() => setShowAltaForm(true)}>
                + Agregar uno nuevo
              </Button>
            )}
          </div>

          {showAltaForm && !readOnlyPropio && (
            <div className="mb-6">
              <CatalogoAltaPanel
                initialDenominacion={initialDenominacion}
                successSuffix={successSuffix}
                loadNextCodigo={loadNextCodigo}
                loadGrupos={loadGrupos}
                loadClases={loadClases}
                searchCuentasContables={searchCuentasContables}
                suggestGrupo={suggestGrupo}
                onRegisterOpcionPersonalizada={onRegisterOpcionPersonalizada}
                onDeleteOpcionPersonalizada={onDeleteOpcionPersonalizada}
                onSubmit={onCreate}
                onItemCreated={handleItemCreated}
                onClose={() => setShowAltaForm(false)}
              />
            </div>
          )}

          <CatalogoPropioPanel
            listItems={listPropio}
            loadGrupos={loadGrupos}
            loadClases={loadClases}
            searchCuentasContables={searchCuentasContables}
            onRegisterOpcionPersonalizada={onRegisterOpcionPersonalizada}
            onDeleteOpcionPersonalizada={onDeleteOpcionPersonalizada}
            onUpdate={onUpdatePropio}
            onDelete={onDeletePropio}
            reloadKey={propioReloadKey}
            readOnly={readOnlyPropio}
            onAddNew={readOnlyPropio || showAltaForm ? undefined : () => setShowAltaForm(true)}
          />
        </div>
      ) : tab === "cuentas" ? (
        <div className="overflow-visible rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-4">
            <h3 className="font-semibold">Cuentas contables</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Catálogo maestro de códigos y nombres contables. Puede crear, editar o eliminar
              cuentas que no estén en uso por bienes del catálogo.
            </p>
          </div>
          <CuentasContablesPanel
            listCuentas={listCuentas}
            onUpsert={handleUpsertCuenta}
            onDelete={onDeleteCuentaContable ? handleDeleteCuenta : undefined}
            readOnly={readOnlyCuentasContables || !onUpsertCuentaContable}
            reloadKey={cuentasReloadKey}
          />
        </div>
      ) : (
        <div className="overflow-visible rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-4">
            <h3 className="font-semibold">Consulta catálogo nacional</h3>
          </div>
          <CatalogoNacionalConsulta
            searchItems={searchNacional}
            searchCuentasContables={searchCuentasContables}
            offlineHint={offlineHint}
            onUpdateContabilidad={onUpdateNacionalContabilidad}
            readOnlyContabilidad={readOnlyNacionalContabilidad}
          />
        </div>
      )}
    </div>
  );
}
