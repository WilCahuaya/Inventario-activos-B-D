"use client";

import { useCallback } from "react";
import type { CuentaContable, UpsertCuentaContableInput } from "@inventario/types";
import { CuentaContableCodigoCombobox } from "./cuenta-contable-codigo-combobox";

export interface CuentaContableFieldsProps {
  codigo: string;
  nombre: string;
  onCodigoChange: (value: string) => void;
  onNombreChange: (value: string) => void;
  searchCuentas: (query: string, limit?: number) => Promise<CuentaContable[]>;
  disabled?: boolean;
  codigoId?: string;
  /** @deprecated Ya no se muestra un campo aparte; se usa solo dentro del flujo «Crear nueva». */
  nombreId?: string;
  allowCreateNew?: boolean;
  onCreateCuenta?: (
    input: UpsertCuentaContableInput,
  ) => Promise<{ data?: CuentaContable; error?: string }>;
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
  allowCreateNew = true,
  onCreateCuenta,
  onCodigosMaestraLoaded,
}: CuentaContableFieldsProps) {
  const handleCuentasLoaded = useCallback(
    (cuentas: CuentaContable[]) => {
      onCodigosMaestraLoaded?.(cuentas.map((c) => c.codigo));
    },
    [onCodigosMaestraLoaded],
  );

  return (
    <CuentaContableCodigoCombobox
      id={codigoId}
      value={codigo}
      nombre={nombre}
      disabled={disabled}
      searchCuentas={searchCuentas}
      allowCreateNew={allowCreateNew}
      onCreateCuenta={onCreateCuenta}
      nombreId={`${codigoId}_nombre_custom`}
      onChange={onCodigoChange}
      onNombreChange={onNombreChange}
      onCuentasLoaded={handleCuentasLoaded}
      onCuentaSelected={(cuenta) => {
        if (cuenta?.nombre) onNombreChange(cuenta.nombre);
      }}
    />
  );
}
