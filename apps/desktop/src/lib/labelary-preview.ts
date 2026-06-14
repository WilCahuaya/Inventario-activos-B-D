import { LABEL_DPI, LABEL_HEIGHT_MM, LABEL_WIDTH_MM } from "./zpl";

/** 203 dpi ≈ 8 dots/mm (Labelary). */
const LABELARY_DPMM = Math.round(LABEL_DPI / 25.4);

/** 50×25 mm en pulgadas (proporción 2:1 exacta para Labelary). */
const LABEL_WIDTH_IN = (LABEL_WIDTH_MM / 25.4).toFixed(2);
const LABEL_HEIGHT_IN = (LABEL_HEIGHT_MM / 25.4).toFixed(2);

const LABELARY_URL = `https://api.labelary.com/v1/printers/${LABELARY_DPMM}dpmm/labels/${LABEL_WIDTH_IN}x${LABEL_HEIGHT_IN}/0/`;

const FETCH_TIMEOUT_MS = 12_000;

export type LabelaryPreviewResult =
  | { ok: true; objectUrl: string }
  | { ok: false; reason: "offline" | "http" | "timeout" | "unknown" };

/** Renderiza ZPL a PNG vía Labelary (requiere red). */
export async function fetchLabelaryPreviewPng(zpl: string): Promise<LabelaryPreviewResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(LABELARY_URL, {
      method: "POST",
      headers: {
        Accept: "image/png",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: zpl,
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, reason: "http" };
    }

    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) {
      return { ok: false, reason: "unknown" };
    }

    return { ok: true, objectUrl: URL.createObjectURL(blob) };
  } catch (err) {
    if (!navigator.onLine) {
      return { ok: false, reason: "offline" };
    }
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, reason: "timeout" };
    }
    return { ok: false, reason: "unknown" };
  } finally {
    clearTimeout(timeout);
  }
}
