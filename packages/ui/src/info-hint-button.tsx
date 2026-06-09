"use client";

import type { MouseEvent, ReactNode } from "react";
import { useState } from "react";
import { Dialog } from "./components";

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

interface InfoHintButtonProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function InfoHintButton({ title, children, className }: InfoHintButtonProps) {
  const [open, setOpen] = useState(false);

  function handleOpen(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        onMouseDown={(event) => event.stopPropagation()}
        className={
          className ??
          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        }
        aria-label={`Más información: ${title}`}
      >
        <InfoIcon className="h-4 w-4" />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title} className="max-w-md">
        <div className="space-y-3 text-sm text-muted-foreground">{children}</div>
      </Dialog>
    </>
  );
}
