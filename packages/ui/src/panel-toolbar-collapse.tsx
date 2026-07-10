"use client";

import type { ButtonHTMLAttributes } from "react";
import { panelToolbarExpandTriggerClass } from "./responsive-layout";

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function PanelToolbarExpandTrigger({
  label = "Volver a filtros y acciones",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label?: string }) {
  return (
    <button
      type="button"
      className={className ? `${panelToolbarExpandTriggerClass} ${className}` : panelToolbarExpandTriggerClass}
      {...props}
    >
      <ChevronDownIcon className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </button>
  );
}
