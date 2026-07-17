"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  normalizeCuentaCodigo,
  type CuentaContable,
  type UpsertCuentaContableInput,
} from "@inventario/types";
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
  onCreateCuenta?: (
    input: UpsertCuentaContableInput,
  ) => Promise<{ data?: CuentaContable; error?: string }>;
  helperText?: string;
  nombreId?: string;
}

export function CuentaContableCodigoCombobox({
  id = "cuenta_codigo",
  label = "Cuenta contable",
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
  onCreateCuenta,
  helperText = "Seleccione una cuenta de la lista o elija «Crear nueva cuenta contable».",
  nombreId = "cuenta_nombre_custom",
}: CuentaContableCodigoComboboxProps) {
  const [cuentas, setCuentas] = useState<CuentaContable[]>([]);
  const [loadingCuentas, setLoadingCuentas] = useState(false);
  const [creatingCuenta, setCreatingCuenta] = useState(false);
  const [mode, setMode] = useState<"select" | "custom">("select");
  const [customCodigo, setCustomCodigo] = useState("");
  const [customNombre, setCustomNombre] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const enteringCustomRef = useRef(false);

  const puedeCrearCuenta = allowCreateNew && Boolean(onCreateCuenta);
  const loading = loadingExternal || loadingCuentas || creatingCuenta;

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


  const selectOptions = useMemo((): SelectOption[] => {
    const items: SelectOption[] = [
      {
        value: "",
        label: loading ? "Cargando cuentas…" : "Seleccione cuenta contable",
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

    if (puedeCrearCuenta) {
      items.push({
        value: OTROS_VALUE,
        label: "Crear nueva cuenta contable…",
        kind: "action",
      });
    }

    return items;
  }, [codigos, cuentasByCodigo, cuentas, loading, puedeCrearCuenta]);

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
    } else if (nombre.trim()) {
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

  async function confirmCreateCuenta() {
    const normalizado = normalizeCuentaCodigo(customCodigo);
    const nombreTrim = customNombre.trim();
    if (!normalizado) {
      setCustomError("El código debe tener entre 1 y 6 dígitos.");
      return;
    }
    if (!nombreTrim) {
      setCustomError("Indique el nombre de la cuenta contable.");
      return;
    }
    if (!onCreateCuenta) {
      setCustomError("No se puede crear la cuenta en este contexto.");
      return;
    }

    setCreatingCuenta(true);
    setCustomError(null);
    try {
      const result = await onCreateCuenta({ codigo: normalizado, nombre: nombreTrim });
      if (result.error) {
        setCustomError(result.error);
        return;
      }

      const cuenta: CuentaContable = result.data ?? {
        codigo: normalizado,
        nombre: nombreTrim,
      };
      const updatedCuentas = [...cuentas.filter((c) => c.codigo !== cuenta.codigo), cuenta].sort(
        (a, b) => a.codigo.localeCompare(b.codigo),
      );
      setCuentas(updatedCuentas);
      onCuentasLoaded?.(updatedCuentas);
      setMode("select");
      setCustomCodigo("");
      setCustomNombre("");
      onChange(cuenta.codigo);
      onNombreChange?.(cuenta.nombre ?? nombreTrim);
      onCuentaSelected?.(cuenta);
    } finally {
      setCreatingCuenta(false);
    }
  }

  const codigoNormalizado = normalizeCuentaCodigo(customCodigo);
  const puedeConfirmarCustom = Boolean(codigoNormalizado && customNombre.trim());

  return (
    <div className="relative space-y-2 overflow-visible">
      <Label htmlFor={mode === "select" ? id : `${id}_custom`}>{label}</Label>

      {mode === "select" ? (
        <Select
          id={id}
          value={selectValue}
          disabled={disabled || loading || (codigos.length === 0 && !puedeCrearCuenta)}
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
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]{1,6}"
              title="Hasta 6 dígitos"
              className="font-mono"
              onChange={(e) => {
                setCustomCodigo(e.target.value.replace(/\D/g, "").slice(0, 6));
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
                  void confirmCreateCuenta();
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
              disabled={disabled || creatingCuenta || !puedeConfirmarCustom || !onCreateCuenta}
              onClick={() => void confirmCreateCuenta()}
            >
              {creatingCuenta ? "Creando…" : "Crear cuenta"}
            </Button>
          </div>
        </div>
      )}

      {helperText && mode === "select" && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
