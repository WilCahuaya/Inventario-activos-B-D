"use client";

import { useRef, type InputHTMLAttributes } from "react";
import { formatFechaInputDDMMYYYY } from "@inventario/types";
import { Input } from "./components";

function estimateCursorAfterFechaFormat(
  prev: string,
  next: string,
  cursor: number,
): number {
  if (!next) return 0;
  const digitsBefore = prev.slice(0, cursor).replace(/\D/g, "").length;
  if (digitsBefore === 0) return Math.min(cursor, next.length);

  let digitsSeen = 0;
  for (let i = 0; i < next.length; i++) {
    if (/\d/.test(next[i]!)) {
      digitsSeen++;
      if (digitsSeen >= digitsBefore) {
        return i + 1;
      }
    }
  }
  return next.length;
}

export type FechaDdMmYyyyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  value: string;
  onChange: (value: string) => void;
};

export function FechaDdMmYyyyInput({
  value,
  onChange,
  className,
  disabled,
  id,
  placeholder = "DD/MM/AAAA",
  ...rest
}: FechaDdMmYyyyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.target;
    const cursor = el.selectionStart ?? value.length;
    const next = formatFechaInputDDMMYYYY(el.value);
    onChange(next);
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      const pos = estimateCursorAfterFechaFormat(value, next, cursor);
      input.setSelectionRange(pos, pos);
    });
  }

  return (
    <Input
      {...rest}
      ref={inputRef}
      id={id}
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      maxLength={10}
      autoComplete="off"
      spellCheck={false}
      value={value}
      disabled={disabled}
      className={className}
      onChange={handleChange}
    />
  );
}
