"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ActivoAtributoCampo } from "@inventario/types";
import { computeFloatingMenuLayout, type FloatingMenuLayout } from "./dropdown-position";
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
  const [menuLayout, setMenuLayout] = useState<FloatingMenuLayout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  const showList = open && (loading || results.length > 0);

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
        computeFloatingMenuLayout(rect, menuHeight, { preferredMaxHeight: 192 }),
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

  useEffect(() => {
    if (!showList) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showList]);

  function selectSuggestion(suggestion: string) {
    onChange(suggestion);
    setOpen(false);
  }

  const listbox =
    showList && menuLayout ? (
      <ul
        ref={listRef}
        role="listbox"
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
    ) : null;

  return (
    <div ref={containerRef} className={open ? "relative z-50 space-y-2" : "space-y-2"}>
      <Label htmlFor={id}>{label}</Label>
      <div ref={anchorRef} className="relative">
        <Input
          id={id}
          autoComplete="off"
          spellCheck={campo === "serie" || campo === "medidas" ? false : undefined}
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
      </div>
      {typeof document !== "undefined" && listbox ? createPortal(listbox, document.body) : null}
    </div>
  );
}
