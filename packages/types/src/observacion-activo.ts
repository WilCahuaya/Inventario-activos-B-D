type EstadoBienLocal = "BUENO" | "REGULAR" | "MALO";

export const OBSERVACION_ADMIN_SEPARATOR = "\n---ADMIN---\n";

export interface ObservacionActivoPartes {
  contador: string;
  admin: string;
}

export function splitObservacionActivo(
  observacion: string | null | undefined,
): ObservacionActivoPartes {
  const raw = observacion?.trim() ?? "";
  if (!raw) return { contador: "", admin: "" };

  if (raw.startsWith(OBSERVACION_ADMIN_SEPARATOR)) {
    return {
      contador: "",
      admin: raw.slice(OBSERVACION_ADMIN_SEPARATOR.length).trim(),
    };
  }

  const idx = raw.indexOf(OBSERVACION_ADMIN_SEPARATOR);
  if (idx === -1) {
    return { contador: raw, admin: "" };
  }

  return {
    contador: raw.slice(0, idx).trim(),
    admin: raw.slice(idx + OBSERVACION_ADMIN_SEPARATOR.length).trim(),
  };
}

export function mergeObservacionActivo(contador: string, admin: string): string | null {
  const c = contador.trim();
  const a = admin.trim();
  if (!c && !a) return null;
  if (!a) return c;
  if (!c) return `${OBSERVACION_ADMIN_SEPARATOR}${a}`;
  return `${c}${OBSERVACION_ADMIN_SEPARATOR}${a}`;
}

/** Resuelve observación admin (reemplaza, no agrega). Si está vacía y cambió estado, mensaje automático. */
export function resolveObservacionAdmin(
  adminEditado: string,
  estadoAnterior: EstadoBienLocal,
  estadoNuevo: EstadoBienLocal,
): string {
  const nota = adminEditado.trim();
  if (nota) return nota;
  if (estadoAnterior !== estadoNuevo) {
    return `Cambio de ${labelEstadoBien(estadoAnterior)} a ${labelEstadoBien(estadoNuevo)}.`;
  }
  return "";
}

function labelEstadoBien(estado: EstadoBienLocal): string {
  if (estado === "BUENO") return "Bueno";
  if (estado === "REGULAR") return "Regular";
  return "Malo";
}
