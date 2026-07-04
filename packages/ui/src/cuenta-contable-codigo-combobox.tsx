"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeCuentaCodigo, type CuentaContable } from "@inventario/types";
import { Button, Input, Label } from "./components";
import { Select, type SelectOption } from "./select";

const OTROS_VALUE = "__otros__";
const CUENTAS_LIMIT = 100;

function isValorEnLista(value: string, codigos: string[]): boolean {
  return Boolean(value) && codigos.includes(value);
}

function formatCuentaLabel(cuenta: CuentaContable): string {
  return cuenta.nombre ? `${cuenta.codigo} — ${cuenta.nombre}` : cuenta.codigo;
}

export interface CuentaContableCodigoComboboxProps {
  id?: string;
  label?: string;
  value: string;
  nombre?: string;
  onChange: (codigo: string) => void;
  onNombreChange?: (nombre: string) => void;
  onCuentaSelected?: (cuenta: CuentaContable | null) => void;
  onCustomModeChange?: (active: boolean) => void;
  onCuentasLoaded?: (cuentas: CuentaContable[]) => void;
  searchCuentas: (query: string, limit?: number) => Promise<CuentaContable[]>;
  disabled?: boolean;
  loading?: boolean;
  allowCreateNew?: boolean;
  helperText?: string;
  nombreId?: string;
}

export function CuentaContableCodigoCombobox({
  id = "cuenta_codigo",
  label = "Código cuenta contable",
  value,
  nombre = "",
  onChange,
  onNombreChange,
  onCuentaSelected,
  onCustomModeChange,
  onCuentasLoaded,
  searchCuentas,
  disabled = false,
  loading: loadingExternal = false,
  allowCreateNew = true,
  helperText = "Seleccione un código de la lista o elija «Otros» para registrar una cuenta nueva.",
  nombreId = "cuenta_nombre_custom",
}: CuentaContableCodigoComboboxProps) {
  const [cuentas, setCuentas] = useState<CuentaContable[]>([]);
  const [loadingCuentas, setLoadingCuentas] = useState(false);
  const [mode, setMode] = useState<"select" | "custom">("select");
  const [customCodigo, setCustomCodigo] = useState("");
  const [customNombre, setCustomNombre] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const enteringCustomRef = useRef(false);

  const loading = loadingExternal || loadingCuentas;

  useEffect(() => {
    onCustomModeChange?.(mode === "custom");
  }, [mode, onCustomModeChange]);

  useEffect(() => {
    if (disabled) {
      setCuentas([]);
      return;
    }

    let cancelled = false;
    setLoadingCuentas(true);
    void (async () => {
      try {
        const rows = await searchCuentas("", CUENTAS_LIMIT);
        if (!cancelled) {
          setCuentas(rows);
          onCuentasLoaded?.(rows);
        }
      } finally {
        if (!cancelled) setLoadingCuentas(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [disabled, searchCuentas, onCuentasLoaded]);

  const cuentasByCodigo = useMemo(() => {
    const map = new Map(cuentas.map((c) => [c.codigo, c]));
    const valueTrim = value.trim();
    if (valueTrim && !map.has(valueTrim)) {
      map.set(valueTrim, { codigo: valueTrim, nombre: nombre.trim() || null });
    }
    return map;
  }, [cuentas, value, nombre]);

  const codigos = useMemo(
    () => [...cuentasByCodigo.keys()].sort((a, b) => a.localeCompare(b)),
    [cuentasByCodigo],
  );

  const esCodigoNuevo = Boolean(value) && !cuentas.some((c) => c.codigo === value.trim());

  const selectOptions = useMemo((): SelectOption[] => {
    const items: SelectOption[] = [
      {
        value: "",
        label: loading ? "Cargando cuentas…" : "Seleccione código de cuenta",
        kind: "placeholder",
        disabled: true,
      },
    ];

    if (codigos.length > 0) {
      items.push({
        value: "__section_cuentas__",
        label: "Cuentas en base de datos",
        kind: "section-header",
        disabled: true,
      });
      for (const codigo of codigos) {
        const cuenta = cuentasByCodigo.get(codigo)!;
        items.push({
          value: codigo,
          label: formatCuentaLabel(cuenta),
          kind: cuentas.some((c) => c.codigo === codigo) ? "predeterminado" : "extra",
        });
      }
    }

    if (allowCreateNew) {
      items.push({
        value: OTROS_VALUE,
        label: "Otros…",
        kind: "action",
      });
    }

    return items;
  }, [codigos, cuentasByCodigo, cuentas, loading, allowCreateNew]);

  useEffect(() => {
    if (!value) {
      if (enteringCustomRef.current) {
        enteringCustomRef.current = false;
        return;
      }
      setMode("select");
      setCustomCodigo("");
      setCustomNombre("");
      setCustomError(null);
      return;
    }
    if (loadingCuentas) return;
    if (cuentas.some((c) => c.codigo === value.trim())) {
      setMode("select");
    } else {
      setMode("custom");
      setCustomCodigo(value);
      setCustomNombre(nombre);
    }
  }, [value, nombre, cuentas, loadingCuentas]);

  const selectValue = mode === "select" && isValorEnLista(value, codigos) ? value : "";

  function pickCodigo(codigo: string) {
    const cuenta = cuentasByCodigo.get(codigo) ?? null;
    onChange(codigo);
    onCuentaSelected?.(cuenta && cuentas.some((c) => c.codigo === codigo) ? cuenta : null);
  }

  function handleSelectChange(selected: string) {
    if (selected === OTROS_VALUE) {
      enteringCustomRef.current = true;
      setMode("custom");
      setCustomCodigo("");
      setCustomNombre("");
      setCustomError(null);
      onChange("");
      onNombreChange?.("");
      onCuentaSelected?.(null);
      return;
    }
    setMode("select");
    setCustomError(null);
    pickCodigo(selected);
  }

  function cancelCustom() {
    setMode("select");
    setCustomCodigo("");
    setCustomNombre("");
    setCustomError(null);
    onChange("");
    onNombreChange?.("");
    onCuentaSelected?.(null);
  }

  function confirmCustom() {
    const normalizado = normalizeCuentaCodigo(customCodigo);
    const nombreTrim = customNombre.trim();
    if (!normalizado) {
      setCustomError("El código debe tener entre 4 y 6 dígitos.");
      return;
    }
    if (!nombreTrim) {
      setCustomError("Indique el nombre de la cuenta contable.");
      return;
    }
    setCustomError(null);
    onChange(normalizado);
    onNombreChange?.(nombreTrim);
    setCustomCodigo(normalizado);
    setCustomNombre(nombreTrim);
    onCuentaSelected?.(null);
  }

  const selectedCuenta = value ? cuentasByCodigo.get(value.trim()) : undefined;
  const codigoNormalizado = normalizeCuentaCodigo(customCodigo);
  const puedeConfirmarCustom = Boolean(codigoNormalizado && customNombre.trim());

  return (
    <div className="relative space-y-2 overflow-visible">
      <Label htmlFor={mode === "select" ? id : `${id}_custom`}>{label}</Label>

      {mode === "select" ? (
        <Select
          id={id}
          value={selectValue}
          disabled={disabled || loading || (codigos.length === 0 && !allowCreateNew)}
          onChange={handleSelectChange}
          options={selectOptions}
          className="font-mono"
        />
      ) : (
        <div className="space-y-3 rounded-md border border-border/70 bg-muted/20 p-3">
          <p className="text-xs text-muted-foreground">
            Nueva cuenta contable. Complete código y nombre.
          </p>
          <div className="space-y-2">
            <Label htmlFor={`${id}_custom`}>Código</Label>
            <Input
              id={`${id}_custom`}
              autoFocus
              disabled={disabled}
              value={customCodigo}
              placeholder="3361"
              className="font-mono"
              onChange={(e) => {
                setCustomCodigo(e.target.value);
                setCustomError(null);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={nombreId}>Nombre cuenta contable</Label>
            <Input
              id={nombreId}
              disabled={disabled}
              value={customNombre}
              placeholder="Equipos diversos"
              onChange={(e) => {
                setCustomNombre(e.target.value);
                setCustomError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmCustom();
                }
              }}
            />
          </div>
          {customError && <p className="text-xs text-destructive">{customError}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={cancelCustom}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={disabled || !puedeConfirmarCustom}
              onClick={confirmCustom}
            >
              Usar esta cuenta
            </Button>
          </div>
        </div>
      )}

      {value && mode === "select" && (
        <p className="text-xs text-muted-foreground">
          Seleccionado:{" "}
          <strong className="font-mono text-foreground">
            {selectedCuenta ? formatCuentaLabel(selectedCuenta) : value}
          </strong>
        </p>
      )}

      {value && mode === "custom" && esCodigoNuevo && (
        <p className="text-xs text-muted-foreground">
          Cuenta nueva:{" "}
          <strong className="text-foreground">
            <span className="font-mono">{value}</span>
            {nombre.trim() ? ` — ${nombre.trim()}` : ""}
          </strong>
        </p>
      )}

      {helperText && mode === "select" && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
