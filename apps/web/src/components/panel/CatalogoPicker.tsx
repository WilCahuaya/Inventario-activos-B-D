"use client";

import { useEffect, useRef, useState } from "react";
import type { CatalogoNacional } from "@inventario/types";
import { Input, Label } from "@inventario/ui";
import { searchCatalogo } from "@/lib/actions/catalogo";

interface CatalogoPickerProps {
  onSelect: (item: CatalogoNacional) => void;
  onClear?: () => void;
  selectedCodigo?: string;
  disabled?: boolean;
}

export function CatalogoPicker({
  onSelect,
  onClear,
  selectedCodigo,
  disabled,
}: CatalogoPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogoNacional[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedLabel(selectedCodigo ?? null);
  }, [selectedCodigo]);

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
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const items = await searchCatalogo(query, 15);
      setResults(items);
      setOpen(true);
      setLoading(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  function handleSelect(item: CatalogoNacional) {
    onSelect(item);
    setSelectedLabel(item.codigo);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div
      ref={containerRef}
      className={open ? "relative z-50 space-y-2" : "space-y-2"}
    >
      <Label htmlFor="catalogo_search">Código catálogo nacional</Label>
      <div className="relative">
        <Input
          id="catalogo_search"
          type="search"
          autoComplete="off"
          placeholder="Buscar por código (8 dígitos) o denominación…"
          value={query}
          disabled={disabled}
          onChange={(event) => {
            setQuery(event.target.value);
            if (selectedLabel || selectedCodigo) {
              setSelectedLabel(null);
              onClear?.();
            }
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
        />

        {open && (loading || results.length > 0) && (
          <ul
            role="listbox"
            className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-60 overflow-auto rounded-md border border-border bg-card py-1 text-card-foreground shadow-lg ring-1 ring-border/50"
          >
            {loading && (
              <li className="px-3 py-2 text-sm text-muted-foreground">Buscando…</li>
            )}
            {!loading &&
              results.map((item) => (
                <li key={item.codigo} role="option">
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handleSelect(item)}
                  >
                    <span className="font-mono font-medium text-primary">{item.codigo}</span>
                    <span className="ml-2">{item.denominacion}</span>
                    {item.clase && (
                      <span className="mt-0.5 block text-xs text-muted-foreground">{item.clase}</span>
                    )}
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>

      {selectedLabel && (
        <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          Seleccionado: <strong>{selectedLabel}</strong>
        </p>
      )}

      {!selectedCodigo && query.length >= 2 && !loading && results.length === 0 && open && (
        <p className="text-xs text-muted-foreground">Sin coincidencias en el catálogo nacional.</p>
      )}
    </div>
  );
}
