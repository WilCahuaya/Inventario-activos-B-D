"use client";

import {
  BRAND_LOGO_PATH,
  BRAND_LOGO_TRANSFORM,
  BRAND_LOGO_VIEWBOX,
} from "./brand-logo-path";

export function BdPortalBrandIcon({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={BRAND_LOGO_VIEWBOX}
      preserveAspectRatio="xMidYMid meet"
      className={`block shrink-0 ${className}`}
      aria-hidden
    >
      <g transform={BRAND_LOGO_TRANSFORM} className="bd-portal-brand-icon" stroke="none">
        <path d={BRAND_LOGO_PATH} />
      </g>
    </svg>
  );
}
