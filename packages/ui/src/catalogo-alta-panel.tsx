"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  CatalogoNacional,
  CatalogoCampoOpciones,
  CatalogoOpcionTipo,
  CreateCatalogoNacionalInput,
} from "@inventario/types";
import { Button } from "./components";
import { CatalogoNacionalForm } from "./catalogo-nacional-form";
import { panelCardClass } from "./panel";

const OPCIONES_VACIAS: CatalogoCampoOpciones = { opciones: [], personalizadas: [] };

export interface CatalogoAltaPanelProps {
  initialDenominacion?: string;
  /** Texto adicional tras crear el ítem (ej. mensaje offline en desktop). */
  successSuffix?: string;
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
  onSubmit: (
    input: CreateCatalogoNacionalInput,
  ) => Promise<{ data?: CatalogoNacional; error?: string }>;
  onItemCreated?: () => void | Promise<void>;
  onClose?: () => void;
}

export function CatalogoAltaPanel({
  initialDenominacion = "",
  successSuffix,
  loadNextCodigo,
  loadGrupos,
  loadClases,
  suggestGrupo,
  onRegisterOpcionPersonalizada,
  onDeleteOpcionPersonalizada,
  onSubmit,
  onItemCreated,
  onClose,
}: CatalogoAltaPanelProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [created, setCreated] = useState<CatalogoNacional | null>(null);
  const [codigo, setCodigo] = useState("");
  const [codigoLoading, setCodigoLoading] = useState(true);
  const [grupos, setGrupos] = useState<CatalogoCampoOpciones>(OPCIONES_VACIAS);
  const [clases, setClases] = useState<CatalogoCampoOpciones>(OPCIONES_VACIAS);
  const [gruposLoading, setGruposLoading] = useState(true);
  const [clasesLoading, setClasesLoading] = useState(true);
  const [formKey, setFormKey] = useState(0);

  const refreshMeta = useCallback(async () => {
    setCodigoLoading(true);
    setGruposLoading(true);
    setClasesLoading(true);
    try {
      const [nextCodigo, listaGrupos, listaClases] = await Promise.all([
        loadNextCodigo(),
        loadGrupos(),
        loadClases(),
      ]);
      setCodigo(nextCodigo);
      setGrupos(listaGrupos);
      setClases(listaClases);
    } finally {
      setCodigoLoading(false);
      setGruposLoading(false);
      setClasesLoading(false);
    }
  }, [loadClases, loadGrupos, loadNextCodigo]);

  useEffect(() => {
    void refreshMeta();
  }, [refreshMeta]);

  async function handleSubmit(input: CreateCatalogoNacionalInput) {
    setPending(true);
    setError(null);
    setSuccess(null);
    setCreated(null);

    try {
      const result = await onSubmit(input);
      if (result.error) {
        setError(result.error);
        return;
      }

      setCreated(result.data ?? null);
      setSuccess(
        `Ítem ${result.data?.codigo} agregado. Ya puede usarlo al registrar activos de cuenta de orden.${successSuffix ? ` ${successSuffix}` : ""}`,
      );
      setFormKey((k) => k + 1);
      void refreshMeta();
      void onItemCreated?.();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-visible rounded-xl border border-border/70 bg-muted/15 p-4 shadow-sm sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">Nuevo bien de cuenta de orden</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Registre artículos menores que no figuran en el catálogo oficial. El código y la
              contabilidad se asignan automáticamente; seleccione clase y grupo.
            </p>
          </div>
          {onClose && (
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
          )}
        </div>

        <CatalogoNacionalForm
          key={formKey}
          initialDenominacion={initialDenominacion}
          codigo={codigo}
          codigoLoading={codigoLoading}
          grupos={grupos}
          clases={clases}
          gruposLoading={gruposLoading}
          clasesLoading={clasesLoading}
          pending={pending}
          onSuggestGrupo={suggestGrupo}
          onRegisterOpcionPersonalizada={onRegisterOpcionPersonalizada}
          onDeleteOpcionPersonalizada={onDeleteOpcionPersonalizada}
          onOpcionesChanged={refreshMeta}
          onSubmit={handleSubmit}
        />

        {success && (
          <p className="rounded-lg border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-100">
            {success}
            {created && (
              <>
                {" "}
                <strong className="font-mono">{created.codigo}</strong> — {created.denominacion}
              </>
            )}
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      {!onClose && (
        <div className={`${panelCardClass} p-4 text-sm text-muted-foreground`}>
          <p className="font-medium text-foreground">Cómo funciona</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              Código propio secuencial: <code>BD000001</code>, <code>BD000002</code>, etc.
            </li>
            <li>Contabilidad fija: <strong>2524</strong>.</li>
            <li>Estado en catálogo: <strong>EXCLUIDO</strong> (cuenta de orden).</li>
            <li>Elija clase y grupo; puede agregar valores con «Otros» y eliminar los que creó.</li>
          </ul>
        </div>
      )}
    </div>
  );
}
