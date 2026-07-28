/** Normaliza nombre de responsable: trim + espacios colapsados. */
export function normalizeResponsableNombre(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Normaliza DNI peruano: solo dígitos. */
export function normalizeResponsableDni(value: string): string {
  return value.replace(/\D/g, "");
}

/** Normaliza teléfono: solo dígitos. */
export function normalizeResponsableTelefono(value: string): string {
  return value.replace(/\D/g, "");
}

const RESPONSABLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Valida correo opcional (vacío OK). */
export function validarResponsableEmail(email: string | undefined | null): string | null {
  const trimmed = email?.trim() ?? "";
  if (!trimmed) return null;
  if (!RESPONSABLE_EMAIL_RE.test(trimmed)) {
    return "El correo no tiene un formato válido.";
  }
  return null;
}

/** Valida celular Perú opcional: 9 dígitos (vacío OK). */
export function validarResponsableTelefono(telefono: string | undefined | null): string | null {
  const digits = normalizeResponsableTelefono(telefono ?? "");
  if (!digits) return null;
  if (digits.length !== 9) {
    return "El teléfono debe tener 9 dígitos.";
  }
  return null;
}

export interface ResponsableContactoInput {
  nombre: string;
  dni?: string;
  email?: string;
  telefono?: string;
}

export function validarCreateResponsableInput(input: ResponsableContactoInput): string | null {
  if (!normalizeResponsableNombre(input.nombre)) {
    return "El nombre del responsable es obligatorio.";
  }
  const dni = normalizeResponsableDni(input.dni ?? "");
  if (dni && dni.length !== 8) {
    return "El DNI debe tener 8 dígitos.";
  }
  const emailError = validarResponsableEmail(input.email);
  if (emailError) return emailError;
  const telefonoError = validarResponsableTelefono(input.telefono);
  if (telefonoError) return telefonoError;
  return null;
}
