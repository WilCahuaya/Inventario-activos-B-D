"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { CatalogoNacional } from "@inventario/types";
import { CATALOGO_SEARCH_MAX_RESULTS, minCatalogoQueryLength } from "@inventario/types";
import { computeFloatingMenuLayout, type FloatingMenuLayout } from "./dropdown-position";
import { Input, Label } from "./components";

export interface CatalogoPickerProps {
  onSelect: (item: CatalogoNacional) => void;
  onClear?: () => void;
  selectedCodigo?: string;
  selectedDenominacion?: string;
  disabled?: boolean;
  searchCatalogo: (query: string, limit?: number) => Promise<CatalogoNacional[]>;
  resolveCodigo?: (codigo: string) => Promise<CatalogoNacional | null>;
  renderAddMissing?: (query: string) => ReactNode;
}

export function CatalogoPicker({
  onSelect,
  onClear,
  selectedCodigo,
  selectedDenominacion,
  disabled,
  searchCatalogo,
  resolveCodigo,
  renderAddMissing,
}: CatalogoPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogoNacional[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [menuLayout, setMenuLayout] = useState<FloatingMenuLayout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const onSelectRef = useRef(onSelect);
  const searchCatalogoRef = useRef(searchCatalogo);
  const resolveCodigoRef = useRef(resolveCodigo);
  const pickingRef = useRef(false);

  onSelectRef.current = onSelect;
  searchCatalogoRef.current = searchCatalogo;
  resolveCodigoRef.current = resolveCodigo;

  useEffect(() => {
    if (selectedCodigo) {
      setSelectedLabel(
        selectedDenominacion
          ? `${selectedCodigo} — ${selectedDenominacion}`
          : selectedCodigo,
      );
    } else if (!query) {
      setSelectedLabel(null);
    }
  }, [selectedCodigo, selectedDenominacion, query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < minCatalogoQueryLength(trimmed)) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const items = await searchCatalogoRef.current(trimmed, CATALOGO_SEARCH_MAX_RESULTS);
        setResults(items);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  function handleSelect(item: CatalogoNacional) {
    pickingRef.current = false;
    onSelectRef.current(item);
    setSelectedLabel(`${item.codigo} — ${item.denominacion}`);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  async function resolveExactCodigo(codigo: string) {
    const resolve = resolveCodigoRef.current;
    if (!resolve) return;
    const item = await resolve(codigo);
    if (item) handleSelect(item);
  }

  function handleListPointerDown() {
    pickingRef.current = true;
  }

  const trimmedQuery = query.trim();
  const showNoResults =
    !selectedCodigo &&
    trimmedQuery.length >= minCatalogoQueryLength(trimmedQuery) &&
    !loading &&
    results.length === 0 &&
    open;
  const resultsTruncated = !loading && results.length >= CATALOGO_SEARCH_MAX_RESULTS;
  const showList = open && (loading || results.length > 0);

  useLayoutEffect(() => {
    if (!showList || !anchorRef.current) {
      setMenuLayout(null);
      return;
    }

    function updatePosition() {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const menuHeight = listRef.current?.getBoundingClientRect().height ?? 0;
      setMenuLayout(
        computeFloatingMenuLayout(rect, menuHeight, { preferredMaxHeight: 240 }),
      );
    }

    updatePosition();
    const frameId = requestAnimationFrame(() => updatePosition());
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [showList, results.length, loading]);

  const listbox =
    showList && menuLayout ? (
      <ul
        ref={listRef}
        role="listbox"
        onMouseDown={handleListPointerDown}
        className="overflow-auto rounded-md border border-border bg-card py-1 text-card-foreground shadow-lg ring-1 ring-border/50"
        style={{
          position: "fixed",
          top: menuLayout.top,
          left: menuLayout.left,
          minWidth: menuLayout.minWidth,
          maxWidth: menuLayout.maxWidth,
          maxHeight: menuLayout.maxHeight,
          width: "max-content",
          zIndex: 300,
        }}
      >
        {loading && results.length === 0 && (
          <li className="px-3 py-2 text-sm text-muted-foreground">Buscando…</li>
        )}
        {results.map((item) => (
          <li key={item.codigo} role="option">
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              onMouseDown={(event) => event.preventDefault()}
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
        {loading && results.length > 0 && (
          <li className="border-t px-3 py-1.5 text-xs text-muted-foreground">Actualizando…</li>
        )}
        {resultsTruncated && (
          <li className="sticky bottom-0 border-t border-border/70 bg-muted/90 px-3 py-2 text-xs text-muted-foreground backdrop-blur-sm">
            Se muestran los primeros {CATALOGO_SEARCH_MAX_RESULTS} resultados. Añada más palabras o
            el código completo para reducir la lista.
          </li>
        )}
      </ul>
    ) : null;

  return (
    <div ref={containerRef} className={open ? "relative z-50 space-y-2" : "space-y-2"}>
      <Label htmlFor="catalogo_search">Código catálogo nacional</Label>
      <p className="text-xs text-muted-foreground">
        Escriba varias palabras de la denominación o los 8 dígitos del código para acotar la lista.
      </p>
      <div ref={anchorRef} className="relative">
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
          onBlur={() => {
            if (pickingRef.current || !resolveCodigoRef.current) return;
            const trimmed = query.trim();
            if (/^\d{8}$/.test(trimmed) && trimmed !== selectedCodigo) {
              void resolveExactCodigo(trimmed);
            }
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            const trimmed = query.trim();
            if (!trimmed) return;
            const exact = results.find((item) => item.codigo === trimmed);
            if (exact) {
              handleSelect(exact);
              return;
            }
            if (resolveCodigoRef.current && /^\d{8}$/.test(trimmed)) {
              void resolveExactCodigo(trimmed);
              return;
            }
            if (results[0]) handleSelect(results[0]);
          }}
        />

      </div>

      {typeof document !== "undefined" && listbox ? createPortal(listbox, document.body) : null}

      {selectedLabel && (
        <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          Seleccionado: <strong>{selectedLabel}</strong>
        </p>
      )}

      {showNoResults && (
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>Sin coincidencias en el catálogo nacional.</p>
          {renderAddMissing?.(trimmedQuery)}
        </div>
      )}
    </div>
  );
}
