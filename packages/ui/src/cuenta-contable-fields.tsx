"use client";

import { useCallback, useState } from "react";
import type { CuentaContable } from "@inventario/types";
import { Input, Label } from "./components";
import { CuentaContableCodigoCombobox } from "./cuenta-contable-codigo-combobox";

export interface CuentaContableFieldsProps {
  codigo: string;
  nombre: string;
  onCodigoChange: (value: string) => void;
  onNombreChange: (value: string) => void;
  searchCuentas: (query: string, limit?: number) => Promise<CuentaContable[]>;
  disabled?: boolean;
  codigoId?: string;
  nombreId?: string;
  allowCreateNew?: boolean;
  /** Códigos cargados desde la maestra (para validación en el formulario padre). */
  onCodigosMaestraLoaded?: (codigos: string[]) => void;
}

export function CuentaContableFields({
  codigo,
  nombre,
  onCodigoChange,
  onNombreChange,
  searchCuentas,
  disabled = false,
  codigoId = "cuenta_codigo",
  nombreId = "cuenta_nombre",
  allowCreateNew = false,
  onCodigosMaestraLoaded,
}: CuentaContableFieldsProps) {
  const [customMode, setCustomMode] = useState(false);

  const handleCuentasLoaded = useCallback(
    (cuentas: CuentaContable[]) => {
      onCodigosMaestraLoaded?.(cuentas.map((c) => c.codigo));
    },
    [onCodigosMaestraLoaded],
  );

  return (
    <div className="contents">
      <div className="space-y-3">
        <CuentaContableCodigoCombobox
          id={codigoId}
          value={codigo}
          nombre={nombre}
          disabled={disabled}
          searchCuentas={searchCuentas}
          allowCreateNew={allowCreateNew}
          nombreId={`${codigoId}_nombre_custom`}
          onChange={onCodigoChange}
          onNombreChange={onNombreChange}
          onCustomModeChange={setCustomMode}
          onCuentasLoaded={handleCuentasLoaded}
          onCuentaSelected={(cuenta) => {
            if (cuenta?.nombre) onNombreChange(cuenta.nombre);
          }}
        />
      </div>

      {!customMode && (
        <div className="space-y-2">
          <Label htmlFor={nombreId}>Nombre cuenta contable</Label>
          <Input
            id={nombreId}
            value={nombre}
            disabled={disabled}
            placeholder="Ej. Equipos diversos"
            onChange={(e) => onNombreChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Al elegir una cuenta de la lista se completa automáticamente. Puede editarlo para
            actualizar el nombre en todo el catálogo.
          </p>
        </div>
      )}
    </div>
  );
}
