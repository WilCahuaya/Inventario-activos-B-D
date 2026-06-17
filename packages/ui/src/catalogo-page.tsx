"use client";

import { useEffect, useState } from "react";
import type {
  CatalogoNacional,
  CatalogoCampoOpciones,
  CatalogoOpcionTipo,
  CreateCatalogoNacionalInput,
  UpdateCatalogoPropioInput,
} from "@inventario/types";
import { Button } from "./components";
import { CatalogoAltaPanel } from "./catalogo-alta-panel";
import { CatalogoNacionalConsulta } from "./catalogo-nacional-consulta";
import { CatalogoPropioPanel } from "./catalogo-propio-panel";
import { PanelTabs } from "./panel";

type CatalogoTab = "propio" | "nacional";

const CATALOGO_TABS: { id: CatalogoTab; label: string }[] = [
  { id: "propio", label: "Catálogo propio" },
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
}: CatalogoPageProps) {
  const [tab, setTab] = useState<CatalogoTab>("propio");
  const [propioReloadKey, setPropioReloadKey] = useState(0);
  const [showAltaForm, setShowAltaForm] = useState(false);

  useEffect(() => {
    if (initialDenominacion.trim()) {
      setShowAltaForm(true);
    }
  }, [initialDenominacion]);

  function handleItemCreated() {
    setPropioReloadKey((k) => k + 1);
    setShowAltaForm(false);
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
            onRegisterOpcionPersonalizada={onRegisterOpcionPersonalizada}
            onDeleteOpcionPersonalizada={onDeleteOpcionPersonalizada}
            onUpdate={onUpdatePropio}
            onDelete={onDeletePropio}
            reloadKey={propioReloadKey}
            readOnly={readOnlyPropio}
            onAddNew={readOnlyPropio || showAltaForm ? undefined : () => setShowAltaForm(true)}
          />
        </div>
      ) : (
        <div className="overflow-visible rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-4">
            <h3 className="font-semibold">Consulta catálogo nacional</h3>
          </div>
          <CatalogoNacionalConsulta searchItems={searchNacional} offlineHint={offlineHint} />
        </div>
      )}
    </div>
  );
}
