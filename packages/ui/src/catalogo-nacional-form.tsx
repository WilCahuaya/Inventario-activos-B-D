"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CATALOGO_CUENTA_ORDEN_CONTABILIDAD,
  CATALOGO_CUENTA_ORDEN_ESTADO,
  type CatalogoCampoOpciones,
  type CatalogoOpcionTipo,
  type CreateCatalogoNacionalInput,
} from "@inventario/types";
import { Button, Input, Label } from "./components";
import { ClaseCatalogoCombobox } from "./clase-catalogo-combobox";
import { GrupoCatalogoCombobox } from "./grupo-catalogo-combobox";

export interface CatalogoNacionalFormProps {
  initialDenominacion?: string;
  codigo: string;
  codigoLoading?: boolean;
  grupos?: CatalogoCampoOpciones;
  clases?: CatalogoCampoOpciones;
  gruposLoading?: boolean;
  clasesLoading?: boolean;
  pending?: boolean;
  onSuggestGrupo?: (denominacion: string) => Promise<string | null>;
  onRegisterOpcionPersonalizada?: (
    tipo: CatalogoOpcionTipo,
    valor: string,
  ) => void | Promise<void | { error?: string }>;
  onDeleteOpcionPersonalizada?: (
    tipo: CatalogoOpcionTipo,
    valor: string,
  ) => void | Promise<{ error?: string } | void>;
  onOpcionesChanged?: () => void | Promise<void>;
  onSubmit: (input: CreateCatalogoNacionalInput) => void | Promise<void>;
}

export function CatalogoNacionalForm({
  initialDenominacion = "",
  codigo,
  codigoLoading = false,
  grupos = { opciones: [], personalizadas: [] },
  clases = { opciones: [], personalizadas: [] },
  gruposLoading = false,
  clasesLoading = false,
  pending = false,
  onSuggestGrupo,
  onRegisterOpcionPersonalizada,
  onDeleteOpcionPersonalizada,
  onOpcionesChanged,
  onSubmit,
}: CatalogoNacionalFormProps) {
  const [denominacion, setDenominacion] = useState(initialDenominacion);
  const [grupo, setGrupo] = useState("");
  const [clase, setClase] = useState("");
  const [grupoSugerido, setGrupoSugerido] = useState<string | null>(null);
  const [grupoManual, setGrupoManual] = useState(false);
  const [sugiriendoGrupo, setSugiriendoGrupo] = useState(false);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const grupoManualRef = useRef(false);
  const onSuggestGrupoRef = useRef(onSuggestGrupo);
  onSuggestGrupoRef.current = onSuggestGrupo;

  const gruposDisponibles = useMemo(() => {
    const merged = new Set(grupos.opciones);
    if (grupo) merged.add(grupo);
    return [...merged].sort((a, b) => a.localeCompare(b, "es"));
  }, [grupos.opciones, grupo]);

  const clasesDisponibles = useMemo(() => {
    const merged = new Set(clases.opciones);
    if (clase) merged.add(clase);
    return [...merged].sort((a, b) => a.localeCompare(b, "es"));
  }, [clases.opciones, clase]);

  function setGrupoManualState(manual: boolean) {
    grupoManualRef.current = manual;
    setGrupoManual(manual);
  }

  useEffect(() => {
    setDenominacion(initialDenominacion);
    setGrupo("");
    setClase("");
    setGrupoSugerido(null);
    setGrupoManualState(false);
  }, [initialDenominacion, codigo]);

  useEffect(() => {
    const texto = denominacion.trim();
    if (texto.length < 2 || grupoManual) {
      setSugiriendoGrupo(false);
      return;
    }

    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    setSugiriendoGrupo(true);

    suggestTimerRef.current = setTimeout(() => {
      void (async () => {
        const sugeridoRemoto = onSuggestGrupoRef.current
          ? await onSuggestGrupoRef.current(texto)
          : null;
        const sugerido = sugeridoRemoto;

        setSugiriendoGrupo(false);
        if (grupoManualRef.current) return;

        setGrupoSugerido(sugerido);
        if (sugerido) setGrupo(sugerido);
      })();
    }, 350);

    return () => {
      if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    };
  }, [denominacion, grupoManual]);

  function handleDenominacionChange(value: string) {
    setDenominacion(value);
    setGrupoManualState(false);
    setGrupoSugerido(null);
  }

  function handleGrupoChange(value: string) {
    setGrupo(value);
    setGrupoManualState(Boolean(value));
    if (value && value !== grupoSugerido) setGrupoSugerido(null);
  }

  async function handleRegister(tipo: CatalogoOpcionTipo, valor: string) {
    await onRegisterOpcionPersonalizada?.(tipo, valor);
    await onOpcionesChanged?.();
  }

  async function handleDelete(tipo: CatalogoOpcionTipo, valor: string) {
    const result = await onDeleteOpcionPersonalizada?.(tipo, valor);
    await onOpcionesChanged?.();
    return result;
  }

  const camposDeshabilitados = pending || codigoLoading;

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit({
          codigo,
          denominacion,
          grupo,
          clase,
          estado: CATALOGO_CUENTA_ORDEN_ESTADO,
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="catalogo_codigo">Código</Label>
        <Input
          id="catalogo_codigo"
          readOnly
          disabled
          value={codigoLoading ? "Generando…" : codigo}
          className="bg-muted font-mono"
        />
        <p className="text-xs text-muted-foreground">
          Secuencia automática para bienes de cuenta de orden (BD000001, BD000002…).
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="catalogo_contabilidad">Contabilidad</Label>
        <Input
          id="catalogo_contabilidad"
          readOnly
          disabled
          value={CATALOGO_CUENTA_ORDEN_CONTABILIDAD}
          className="bg-muted font-mono"
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="catalogo_denominacion">Denominación</Label>
        <Input
          id="catalogo_denominacion"
          required
          value={denominacion}
          disabled={camposDeshabilitados}
          placeholder="CUCHARA DE COCINA"
          onChange={(e) => handleDenominacionChange(e.target.value)}
        />
      </div>

      <div className="sm:col-span-2">
        <ClaseCatalogoCombobox
          id="catalogo_clase"
          value={clase}
          opciones={clasesDisponibles}
          personalizadas={clases.personalizadas}
          disabled={camposDeshabilitados || clasesLoading}
          loading={clasesLoading}
          onChange={setClase}
          onRegisterPersonalizada={(valor) => handleRegister("clase", valor)}
          onDeletePersonalizada={(valor) => handleDelete("clase", valor)}
        />
      </div>

      <div className="sm:col-span-2">
        <GrupoCatalogoCombobox
          id="catalogo_grupo"
          value={grupo}
          grupos={gruposDisponibles}
          personalizadas={grupos.personalizadas}
          disabled={camposDeshabilitados}
          loading={gruposLoading}
          suggestedGrupo={grupoSugerido}
          onChange={handleGrupoChange}
          onRegisterPersonalizada={(valor) => handleRegister("grupo", valor)}
          onDeletePersonalizada={(valor) => handleDelete("grupo", valor)}
          helperText={
            sugiriendoGrupo
              ? "Buscando grupo recomendado según la denominación…"
              : undefined
          }
        />
      </div>

      <div className="sm:col-span-2">
        <Button
          type="submit"
          disabled={camposDeshabilitados || !codigo || !grupo || !clase}
        >
          {pending ? "Guardando…" : "Agregar al catálogo"}
        </Button>
      </div>
    </form>
  );
}
