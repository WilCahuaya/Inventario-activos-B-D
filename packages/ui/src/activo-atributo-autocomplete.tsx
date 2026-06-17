"use client";

import { useEffect, useRef, useState } from "react";
import type { ActivoAtributoCampo } from "@inventario/types";
import { Input, Label } from "./components";

const MIN_QUERY_LENGTH = 1;
const DEBOUNCE_MS = 250;

interface ActivoAtributoAutocompleteProps {
  id: string;
  label: string;
  campo: ActivoAtributoCampo;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  onSearch: (campo: ActivoAtributoCampo, query: string) => Promise<string[]>;
}

export function ActivoAtributoAutocomplete({
  id,
  label,
  campo,
  value,
  onChange,
  disabled,
  placeholder,
  onSearch,
}: ActivoAtributoAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      void onSearchRef
        .current(campo, trimmed)
        .then((items) => {
          setResults(items);
          setOpen(items.length > 0);
        })
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [campo, value]);

  function selectSuggestion(suggestion: string) {
    onChange(suggestion);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={open ? "relative z-50 space-y-2" : "space-y-2"}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          autoComplete="off"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              return;
            }
            if (e.key === "Enter" && open && results[0]) {
              e.preventDefault();
              selectSuggestion(results[0]);
            }
          }}
        />
        {open && (loading || results.length > 0) && (
          <ul
            role="listbox"
            className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-48 overflow-auto rounded-md border border-border bg-card py-1 text-card-foreground shadow-lg ring-1 ring-border/50"
          >
            {loading && results.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">Buscando…</li>
            )}
            {results.map((item) => (
              <li key={item} role="option">
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectSuggestion(item)}
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
