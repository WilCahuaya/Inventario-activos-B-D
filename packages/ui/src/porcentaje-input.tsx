"use client";

import type { FocusEvent, InputHTMLAttributes } from "react";
import {
  formatPorcentajeDepreciacion,
  parsePorcentajeDepreciacion,
} from "@inventario/types";
import { Input } from "./components";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function displayPorcentajeDepreciacion(value: string): string {
  const normalized = value.replace(/\u00a0/g, " ").trim();
  if (!normalized) return "";
  const match = normalized.match(/^(\d+(?:[.,]\d+)?)\s*%?$/);
  return match ? match[1] : normalized.replace(/\s*%/g, "").trim();
}

export function PorcentajeInput({
  value,
  onChange,
  onBlur,
  className,
  placeholder = "Ej. 10",
  inputMode = "decimal",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  function emitFromRaw(raw: string) {
    const cleaned = raw.replace(/%/g, "").trim();
    if (!cleaned) {
      onChange("");
      return;
    }
    if (!/^\d*[.,]?\d*$/.test(cleaned)) return;

    const pct = parsePorcentajeDepreciacion(cleaned);
    if (pct) {
      onChange(formatPorcentajeDepreciacion(pct));
      return;
    }

    onChange(cleaned);
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    const pct = parsePorcentajeDepreciacion(value);
    if (pct) onChange(formatPorcentajeDepreciacion(pct));
    onBlur?.(event);
  }

  return (
    <div className="relative">
      <Input
        {...props}
        type="text"
        inputMode={inputMode}
        value={displayPorcentajeDepreciacion(value)}
        placeholder={placeholder}
        className={cn("pr-9", className)}
        onChange={(event) => emitFromRaw(event.target.value)}
        onBlur={handleBlur}
      />
      <span
        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
        aria-hidden
      >
        %
      </span>
    </div>
  );
}
