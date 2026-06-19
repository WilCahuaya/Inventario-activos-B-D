"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "./components";

export function Tooltip({
  label,
  children,
  side = "top",
  className,
}: {
  label: string;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePos = useCallback(() => {
    const el = triggerRef.current;
    const tip = tipRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const tipW = tip?.offsetWidth ?? 0;
    const tipH = tip?.offsetHeight ?? 0;
    const gap = 6;
    const margin = 8;

    let top = side === "top" ? rect.top - tipH - gap : rect.bottom + gap;
    let left = rect.left + rect.width / 2 - tipW / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - tipW - margin));

    if (side === "top" && top < margin) {
      top = rect.bottom + gap;
    }

    setPos({ top, left });
  }, [side]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePos();
    const id = requestAnimationFrame(updatePos);
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open, updatePos, label]);

  if (!label.trim()) {
    return <span className={cn("inline-flex", className)}>{children}</span>;
  }

  return (
    <>
      <span
        ref={triggerRef}
        className={cn("inline-flex", className)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </span>
      {open &&
        mounted &&
        createPortal(
          <span
            ref={tipRef}
            role="tooltip"
            className="pointer-events-none fixed z-[400] max-w-[16rem] whitespace-normal rounded-md border border-primary/30 bg-primary px-2.5 py-1.5 text-center text-xs font-medium leading-snug text-primary-foreground shadow-lg"
            style={{ top: pos.top, left: pos.left }}
          >
            {label}
          </span>,
          document.body,
        )}
    </>
  );
}
