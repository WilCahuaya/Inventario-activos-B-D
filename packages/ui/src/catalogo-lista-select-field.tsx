"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  isCatalogoClasePredeterminada,
  isCatalogoGrupoPredeterminado,
  normalizeCatalogoDenominacion,
  shouldRegistrarCatalogoOpcionPersonalizada,
  type CatalogoOpcionTipo,
} from "@inventario/types";
import { Button, Input, Label } from "./components";
import { Select, type SelectOption } from "./select";

const OTROS_VALUE = "__otros__";

export interface CatalogoListaSelectFieldProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  opciones: string[];
  personalizadas?: string[];
  opcionTipo?: CatalogoOpcionTipo;
  onRegisterPersonalizada?: (valor: string) => void | Promise<void>;
  onDeletePersonalizada?: (valor: string) => void | Promise<{ error?: string } | void>;
  disabled?: boolean;
  loading?: boolean;
  suggestedValue?: string | null;
  helperText?: string;
  emptyOptionLabel?: string;
  loadingLabel?: string;
  customHint?: ReactNode;
  customPlaceholder?: string;
  confirmLabel?: string;
  personalizadoTag?: string;
}

function normalizeOpcionText(value: string): string {
  return normalizeCatalogoDenominacion(value);
}

function isValorEnLista(value: string, opciones: string[]): boolean {
  return Boolean(value) && opciones.includes(value);
}

function isOpcionPredeterminada(opcion: string, tipo?: CatalogoOpcionTipo): boolean {
  if (tipo === "grupo") return isCatalogoGrupoPredeterminado(opcion);
  if (tipo === "clase") return isCatalogoClasePredeterminada(opcion);
  return false;
}

function sortOpciones(items: string[]): string[] {
  return [...items].sort((a, b) => a.localeCompare(b, "es"));
}

export function CatalogoListaSelectField({
  id = "catalogo_lista",
  label,
  value,
  onChange,
  opciones,
  personalizadas = [],
  opcionTipo,
  onRegisterPersonalizada,
  onDeletePersonalizada,
  disabled = false,
  loading = false,
  suggestedValue = null,
  helperText,
  emptyOptionLabel,
  loadingLabel,
  customHint,
  customPlaceholder,
  confirmLabel = "Usar este valor",
  personalizadoTag = "personalizado",
}: CatalogoListaSelectFieldProps) {
  const [mode, setMode] = useState<"select" | "custom">("select");
  const [customText, setCustomText] = useState("");
  const [deletingValor, setDeletingValor] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const enteringCustomRef = useRef(false);

  const esValorPersonalizado = Boolean(value) && !isValorEnLista(value, opciones);
  const emptyLabel = emptyOptionLabel ?? `Seleccione ${label.toLowerCase()}`;
  const loadingText = loadingLabel ?? `Cargando ${label.toLowerCase()}…`;

  const personalizadasVisibles = useMemo(
    () => personalizadas.filter((opcion) => opciones.includes(opcion)),
    [personalizadas, opciones],
  );

  const personalizadasSet = useMemo(
    () => new Set(personalizadasVisibles),
    [personalizadasVisibles],
  );

  const { predeterminados, creados, extras } = useMemo(() => {
    const pred: string[] = [];
    const cre: string[] = [];
    const ext: string[] = [];

    for (const opcion of opciones) {
      if (personalizadasSet.has(opcion)) {
        cre.push(opcion);
      } else if (isOpcionPredeterminada(opcion, opcionTipo)) {
        pred.push(opcion);
      } else {
        ext.push(opcion);
      }
    }

    return {
      predeterminados: sortOpciones(pred),
      creados: sortOpciones(cre),
      extras: sortOpciones(ext),
    };
  }, [opciones, personalizadasSet, opcionTipo]);

  function opcionLabel(opcion: string): string {
    return opcion === suggestedValue && value !== opcion
      ? `${opcion} (recomendado)`
      : opcion;
  }

  const selectOptions = useMemo(() => {
    const items: SelectOption[] = [
      {
        value: "",
        label: loading ? loadingText : emptyLabel,
        kind: "placeholder",
        disabled: true,
      },
    ];

    if (predeterminados.length > 0) {
      items.push({
        value: "__section_predeterminados__",
        label: "Lista predeterminada",
        kind: "section-header",
        disabled: true,
      });
      for (const opcion of predeterminados) {
        items.push({
          value: opcion,
          label: opcionLabel(opcion),
          kind: "predeterminado",
        });
      }
    }

    if (creados.length > 0) {
      items.push({
        value: "__section_creados__",
        label: "Agregados por usted",
        kind: "section-header",
        disabled: true,
      });
      for (const opcion of creados) {
        items.push({
          value: opcion,
          label: opcionLabel(opcion),
          kind: "personalizado",
        });
      }
    }

    if (extras.length > 0) {
      items.push({
        value: "__section_extras__",
        label: "Del catálogo",
        kind: "section-header",
        disabled: true,
      });
      for (const opcion of extras) {
        items.push({
          value: opcion,
          label: opcionLabel(opcion),
          kind: "extra",
        });
      }
    }

    items.push({
      value: OTROS_VALUE,
      label: "Otros…",
      kind: "action",
    });

    return items;
  }, [
    predeterminados,
    creados,
    extras,
    loading,
    loadingText,
    emptyLabel,
    suggestedValue,
    value,
  ]);

  useEffect(() => {
    if (!value) {
      if (enteringCustomRef.current) {
        enteringCustomRef.current = false;
        return;
      }
      setMode("select");
      setCustomText("");
      return;
    }
    if (isValorEnLista(value, opciones)) {
      setMode("select");
    } else {
      setMode("custom");
      setCustomText(value);
    }
  }, [value, opciones]);

  const esValorCreado = Boolean(value) && personalizadasSet.has(value);
  const selectValue = mode === "select" && isValorEnLista(value, opciones) ? value : "";

  function handleSelectChange(selected: string) {
    if (selected === OTROS_VALUE) {
      enteringCustomRef.current = true;
      setMode("custom");
      setCustomText("");
      onChange("");
      return;
    }
    setMode("select");
    onChange(selected);
  }

  function cancelCustom() {
    setMode("select");
    setCustomText("");
    onChange("");
  }

  async function confirmCustom() {
    const normalizado = normalizeOpcionText(customText);
    if (!normalizado) return;
    onChange(normalizado);
    setCustomText(normalizado);
    if (
      opcionTipo &&
      onRegisterPersonalizada &&
      shouldRegistrarCatalogoOpcionPersonalizada(opcionTipo, normalizado)
    ) {
      await onRegisterPersonalizada(normalizado);
    }
  }

  async function handleDeletePersonalizada(valor: string) {
    if (!onDeletePersonalizada) return;
    setDeleteError(null);
    setDeletingValor(valor);
    const result = await onDeletePersonalizada(valor);
    setDeletingValor(null);
    if (result && "error" in result && result.error) {
      setDeleteError(result.error);
      return;
    }
    if (value === valor) onChange("");
  }

  return (
    <div className="relative space-y-2 overflow-visible">
      <Label htmlFor={mode === "select" ? id : `${id}_custom`}>{label}</Label>

      {mode === "select" ? (
        <Select
          id={id}
          value={selectValue}
          disabled={disabled || loading || opciones.length === 0}
          onChange={handleSelectChange}
          options={selectOptions}
          deletableValues={onDeletePersonalizada ? personalizadasVisibles : []}
          onDeleteValue={
            onDeletePersonalizada
              ? (valor) => void handleDeletePersonalizada(valor)
              : undefined
          }
          deletingValue={deletingValor}
        />
      ) : (
        <div className="space-y-2 rounded-md border border-border/70 bg-muted/20 p-3">
          <p className="text-xs text-muted-foreground">
            {customHint ?? (
              <>
                {label} personalizado. Ej.: <strong>99 MI VALOR</strong>
              </>
            )}
          </p>
          <Input
            id={`${id}_custom`}
            autoFocus
            disabled={disabled}
            value={customText}
            placeholder={customPlaceholder ?? "99 VALOR PERSONALIZADO"}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void confirmCustom();
              }
            }}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={cancelCustom}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={disabled || !customText.trim()}
              onClick={() => void confirmCustom()}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      )}

      {value && (
        <p className="text-xs text-muted-foreground">
          Seleccionado: <strong className="text-foreground">{value}</strong>
          {esValorCreado && (
            <span className="ml-1 text-primary">(agregado por usted)</span>
          )}
          {esValorPersonalizado && !esValorCreado && (
            <span className="ml-1 text-primary">({personalizadoTag})</span>
          )}
          {value === suggestedValue && suggestedValue && (
            <span className="ml-1 text-emerald-600 dark:text-emerald-400">(recomendado)</span>
          )}
        </p>
      )}

      {suggestedValue && mode === "select" && !value && (
        <p className="text-xs text-emerald-700 dark:text-emerald-300">
          Sugerencia: <strong>{suggestedValue}</strong>
        </p>
      )}

      {deleteError && (
        <p className="text-xs text-destructive">{deleteError}</p>
      )}

      {helperText && mode === "select" && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
