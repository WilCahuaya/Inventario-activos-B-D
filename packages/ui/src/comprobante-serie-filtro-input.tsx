"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { formatComprobanteSerieInput, normalizarSerieComprobante } from "@inventario/types";
import { computeFloatingMenuLayout, type FloatingMenuLayout } from "./dropdown-position";
import { Input } from "./components";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export interface ComprobanteSerieFiltroInputProps {
  value: string;
  onChange: (value: string) => void;
  series: string[];
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  placeholder?: string;
}

export function ComprobanteSerieFiltroInput({
  value,
  onChange,
  series,
  disabled = false,
  className,
  "aria-label": ariaLabel = "Serie de comprobante",
  placeholder = "Comprobante: ej. F001 - 003",
}: ComprobanteSerieFiltroInputProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [menuLayout, setMenuLayout] = useState<FloatingMenuLayout | null>(null);

  const sugerencias = useMemo(() => {
    const query = normalizarSerieComprobante(value);
    if (!query) return series.slice(0, 20);
    return series.filter((s) => s.includes(query)).slice(0, 20);
  }, [series, value]);

  const showList = open && sugerencias.length > 0 && !disabled;

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
  }, [showList, sugerencias.length]);

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
        id={listId}
        role="listbox"
        className="overflow-auto rounded-md border border-border bg-card py-1 font-mono text-card-foreground shadow-lg ring-1 ring-border/50"
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
        {sugerencias.map((item) => (
          <li key={item} role="option" aria-selected={item === value}>
            <button
              type="button"
              className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground"
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
    <div
      ref={containerRef}
      className={cn(open && "relative z-50", "min-w-[9rem] max-w-[12rem] flex-1")}
    >
      <div ref={anchorRef} className="relative">
        <Input
          value={value}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-controls={showList ? listId : undefined}
          aria-expanded={showList}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          className={cn(
            "h-8 py-1 font-mono text-xs",
            className,
          )}
          onChange={(e) => onChange(formatComprobanteSerieInput(e.target.value))}
          onFocus={() => {
            if (series.length > 0) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              return;
            }
            if (e.key === "Enter" && open && sugerencias[0]) {
              e.preventDefault();
              selectSuggestion(sugerencias[0]);
            }
          }}
        />
      </div>
      {typeof document !== "undefined" && listbox ? createPortal(listbox, document.body) : null}
    </div>
  );
}
