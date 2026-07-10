"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Scroll unificado: filtros + tabla. Al bajar, la barra sale de vista; flecha vuelve arriba. */
export function usePanelInventarioUnifiedScroll(triggerThreshold = 32) {
  const scrollElRef = useRef<HTMLDivElement | null>(null);
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
  const [showToolbarTrigger, setShowToolbarTrigger] = useState(false);

  const panelScrollRef = useCallback((node: HTMLDivElement | null) => {
    scrollElRef.current = node;
    setScrollElement(node);
  }, []);

  useEffect(() => {
    if (!scrollElement) return;

    const sync = () => {
      setShowToolbarTrigger(scrollElement.scrollTop > triggerThreshold);
    };

    sync();
    scrollElement.addEventListener("scroll", sync, { passive: true });
    return () => scrollElement.removeEventListener("scroll", sync);
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
