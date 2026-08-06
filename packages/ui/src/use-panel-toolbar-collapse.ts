"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Scroll unificado: filtros + tabla. Al bajar, la barra sale de vista; flecha vuelve arriba. */
export function usePanelInventarioUnifiedScroll(triggerThreshold = 32) {
  const scrollElRef = useRef<HTMLDivElement | null>(null);
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
  const [showToolbarTrigger, setShowToolbarTrigger] = useState(false);

  const panelScrollRef = useCallback((node: HTMLDivElement | null) => {
    scrollElRef.current = node;
    if (node) {
      node.style.setProperty("--inventario-body-client-width", `${node.clientWidth}px`);
    }
    setScrollElement(node);
  }, []);

  useEffect(() => {
    if (!scrollElement) return;

    const syncScroll = () => {
      setShowToolbarTrigger(scrollElement.scrollTop > triggerThreshold);
    };

    /** Ancho del viewport del scroll: la toolbar sticky-left no se estira con la tabla. */
    const syncClientWidth = () => {
      scrollElement.style.setProperty(
        "--inventario-body-client-width",
        `${scrollElement.clientWidth}px`,
      );
    };

    syncScroll();
    syncClientWidth();
    scrollElement.addEventListener("scroll", syncScroll, { passive: true });
    const resizeObserver = new ResizeObserver(syncClientWidth);
    resizeObserver.observe(scrollElement);

    return () => {
      scrollElement.removeEventListener("scroll", syncScroll);
      resizeObserver.disconnect();
    };
  }, [scrollElement, triggerThreshold]);

  const scrollToToolbar = useCallback(() => {
    scrollElRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return {
    panelScrollRef,
    showToolbarTrigger,
    scrollToToolbar,
  };
}

/** @deprecated Usar usePanelInventarioUnifiedScroll */
export function usePanelToolbarCollapseOnVerticalScroll() {
  const { panelScrollRef, showToolbarTrigger, scrollToToolbar } = usePanelInventarioUnifiedScroll();
  return {
    toolbarExpanded: !showToolbarTrigger,
    expandToolbar: scrollToToolbar,
    collapseToolbar: () => {},
    tableScrollRef: panelScrollRef,
    panelScrollRef,
    showToolbarTrigger,
    scrollToToolbar,
  };
}

/** @deprecated Usar usePanelInventarioUnifiedScroll */
export const usePanelToolbarCollapseOnHorizontalScroll = usePanelToolbarCollapseOnVerticalScroll;
