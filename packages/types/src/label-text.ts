/**
 * Ajuste de una línea ^FB para etiqueta 50 mm (Honeywell, fuente ZPL 0).
 */

export const LABEL_FIT_FONT_STEPS = [22, 18, 16] as const;

export const LABEL_PRINT_WIDTH_DOTS = Math.round((50 * 203) / 25.4);

export const LABEL_PRINT_LAYOUT_FONTS = {
  nombre: 22,
  entidad: 22,
} as const;

export type LabelFitFont = (typeof LABEL_FIT_FONT_STEPS)[number];

export interface LabelLineFit {
  text: string;
  font: number;
  preferredFont: number;
  /** Fuente menor que la preferida del layout. */
  shrunk: boolean;
  /** Texto recortado con … */
  truncated: boolean;
}

export interface FitLabelLineOptions {
  maxWidthDots: number;
  preferredFont: number;
  fonts?: readonly number[];
  maxLines?: number;
}

export type LabelPrintField = "nombre" | "entidad";

export interface LabelPrintWarning {
  field: LabelPrintField;
  fit: LabelLineFit;
}

const ELLIPSIS = "…";

/** Ancho aproximado en dots (ZPL ^A0N, mayúsculas). */
export function estimateTextWidthDots(text: string, font: number): number {
  let width = 0;
  for (const ch of text) {
    if (ch === " ") {
      width += font * 0.28;
    } else if (ch === ELLIPSIS) {
      width += font * 0.4;
    } else if (/[il1I.]/.test(ch)) {
      width += font * 0.3;
    } else if (/[MW@]/.test(ch)) {
      width += font * 0.72;
    } else {
      width += font * 0.55;
    }
  }
  return Math.ceil(width);
}

function fontsToTry(preferredFont: number, fonts: readonly number[]): number[] {
  const sorted = [...fonts].sort((a, b) => b - a);
  const upToPreferred = sorted.filter((f) => f <= preferredFont);
  return upToPreferred.length > 0 ? upToPreferred : sorted;
}

function truncateToWidth(text: string, font: number, maxWidthDots: number): string {
  if (!text) return ELLIPSIS;
  if (estimateTextWidthDots(text, font) <= maxWidthDots) return text;

  let working = text.trimEnd();
  while (working.length > 0) {
    const candidate = `${working}${ELLIPSIS}`;
    if (estimateTextWidthDots(candidate, font) <= maxWidthDots) {
      return candidate;
    }
    const space = working.lastIndexOf(" ");
    if (space > 0 && space >= working.length * 0.4) {
      working = working.slice(0, space).trimEnd();
    } else {
      working = working.slice(0, -1).trimEnd();
    }
  }
  return ELLIPSIS;
}

/**
 * Elige la mayor fuente que quepa en maxWidthDots; si ninguna cabe, trunca con … en la mínima.
 */
export function fitLabelLine(raw: string, options: FitLabelLineOptions): LabelLineFit {
  const text = raw.trim();
  const preferredFont = options.preferredFont;
  const maxWidthDots = options.maxWidthDots;
  const maxLines = options.maxLines ?? 1;
  const widthBudget = maxWidthDots * maxLines;
  const fonts = fontsToTry(preferredFont, options.fonts ?? LABEL_FIT_FONT_STEPS);

  if (!text) {
    return {
      text: "",
      font: preferredFont,
      preferredFont,
      shrunk: false,
      truncated: false,
    };
  }

  for (const font of fonts) {
    if (estimateTextWidthDots(text, font) <= widthBudget) {
      return {
        text,
        font,
        preferredFont,
        shrunk: font < preferredFont,
        truncated: false,
      };
    }
  }

  const minFont = fonts[fonts.length - 1] ?? preferredFont;
  const truncatedText = truncateToWidth(text, minFont, widthBudget);
  return {
    text: truncatedText,
    font: minFont,
    preferredFont,
    shrunk: minFont < preferredFont,
    truncated: truncatedText !== text,
  };
}

export function sanitizeLabelPrintText(value: string): string {
  return value.replace(/[\^~\\]/g, " ").replace(/\s+/g, " ").trim();
}

export function fitLabelPrintLine(raw: string, preferredFont: number): LabelLineFit {
  return fitLabelLine(sanitizeLabelPrintText(raw.toUpperCase()), {
    maxWidthDots: LABEL_PRINT_WIDTH_DOTS,
    preferredFont,
  });
}

/** Avisos si nombre o entidad no caben cómodamente en la etiqueta 50×25 mm. */
export function assessLabelPrintWarnings(input: {
  nombreBien: string;
  entidadNombre: string;
}): LabelPrintWarning[] {
  const warnings: LabelPrintWarning[] = [];

  const nombreFit = fitLabelPrintLine(input.nombreBien, LABEL_PRINT_LAYOUT_FONTS.nombre);
  if (nombreFit.shrunk || nombreFit.truncated) {
    warnings.push({ field: "nombre", fit: nombreFit });
  }

  const entidadFit = fitLabelPrintLine(input.entidadNombre, LABEL_PRINT_LAYOUT_FONTS.entidad);
  if (entidadFit.shrunk || entidadFit.truncated) {
    warnings.push({ field: "entidad", fit: entidadFit });
  }

  return warnings;
}

export function describeLabelPrintWarning(warning: LabelPrintWarning): string {
  const fieldLabel = warning.field === "nombre" ? "nombre del bien" : "nombre de la entidad";

  if (warning.fit.truncated) {
    return `El ${fieldLabel} es largo para la etiqueta 50×25 mm. En impresión se verá como: «${warning.fit.text}».`;
  }

  if (warning.fit.shrunk) {
    return `El ${fieldLabel} se imprimirá con tamaño de fuente reducido para caber en la etiqueta. Vista previa: «${warning.fit.text}».`;
  }

  return "";
}

export function formatLabelPrintWarnings(warnings: LabelPrintWarning[]): string {
  return warnings.map(describeLabelPrintWarning).filter(Boolean).join("\n\n");
}

const LABEL_STOP_WORDS = new Set(["DE", "LA", "EL", "LOS", "LAS", "PARA", "DEL", "Y", "EN", "AL", "A"]);

/** Texto efectivo en etiqueta: override opcional o nombre oficial. */
export function resolveNombreEtiqueta(nombre: string, nombreEtiqueta?: string | null): string {
  const override = nombreEtiqueta?.trim();
  return override || nombre.trim();
}

/** True si el nombre del bien no cabe cómodamente en la etiqueta 50×25 mm. */
export function nombreRequiereEtiquetaOverride(nombre: string): boolean {
  const sanitized = sanitizeLabelPrintText(nombre.toUpperCase());
  if (!sanitized) return false;
  const fit = fitLabelPrintLine(sanitized, LABEL_PRINT_LAYOUT_FONTS.nombre);
  return fit.shrunk || fit.truncated;
}

/** True si la razón social no cabe cómodamente en el pie de la etiqueta 50×25 mm. */
export function entidadNombreRequiereEtiquetaOverride(nombre: string): boolean {
  const sanitized = sanitizeLabelPrintText(nombre.toUpperCase());
  if (!sanitized) return false;
  const fit = fitLabelPrintLine(sanitized, LABEL_PRINT_LAYOUT_FONTS.entidad);
  return fit.shrunk || fit.truncated;
}

/** Sugerencia editable cuando el nombre oficial no cabe en 50 mm. */
export function suggestNombreEtiqueta(
  nombre: string,
  preferredFont: number = LABEL_PRINT_LAYOUT_FONTS.nombre,
): string {
  const sanitized = sanitizeLabelPrintText(nombre.toUpperCase());
  if (!sanitized) return "";

  const fit = fitLabelPrintLine(sanitized, preferredFont);
  if (!fit.truncated && !fit.shrunk) return sanitized;

  const words = sanitized.split(/\s+/).filter((word) => !LABEL_STOP_WORDS.has(word));
  const compact = words.join(" ");
  if (compact && compact !== sanitized) {
    const compactFit = fitLabelPrintLine(compact, preferredFont);
    if (!compactFit.truncated && !compactFit.shrunk) return compact;
    if (!compactFit.truncated) {
      return compactFit.text.replace(/…$/, "").trim() || compact;
    }
  }

  if (fit.truncated) {
    return fit.text.replace(/…$/, "").trim() || sanitized.slice(0, 32);
  }

  return sanitized;
}
