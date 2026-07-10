/** Referencia mínima de sede para reglas de UI y filtros. */
export type SedeRef = {
  id: string;
  es_principal?: boolean;
};

/** La entidad tiene más de una sucursal (Principal + otras). */
export function entidadTieneMultiplesSedes(sedes: readonly SedeRef[]): boolean {
  return sedes.length > 1;
}

/** Mostrar selectores y columnas de sucursal en la UI. */
export function entidadMuestraSelectorSede(sedes: readonly SedeRef[]): boolean {
  return entidadTieneMultiplesSedes(sedes);
}

/** Única sede de la entidad (típicamente Principal). */
export function sedeImplicitaEntidad<T extends SedeRef>(sedes: readonly T[]): T | null {
  return sedes.length === 1 ? sedes[0]! : null;
}

export function findSedePrincipal<T extends SedeRef>(sedes: readonly T[]): T | null {
  return sedes.find((s) => s.es_principal) ?? null;
}

/**
 * Tras cargar sedes: id a usar cuando no hay selector visible.
 * Con una sola sede devuelve esa; con varias devuelve null (el usuario elige).
 */
export function sedeIdSinSelector(sedes: readonly SedeRef[]): string | null {
  return sedeImplicitaEntidad(sedes)?.id ?? null;
}
