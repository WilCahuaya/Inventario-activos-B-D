export const FLOATING_MENU_GAP = 4;
export const FLOATING_VIEWPORT_PADDING = 8;

export type FloatingPlacement = "top" | "bottom";

export interface FloatingMenuLayout {
  top: number;
  left: number;
  minWidth: number;
  maxWidth: number;
  maxHeight: number;
  placement: FloatingPlacement;
}

/** Calcula posición del menú: abre arriba si no cabe abajo y hay más espacio arriba. */
export function computeFloatingMenuLayout(
  triggerRect: DOMRect,
  menuHeight: number,
  options?: {
    gap?: number;
    viewportPadding?: number;
    preferredMaxHeight?: number;
  },
): FloatingMenuLayout {
  const gap = options?.gap ?? FLOATING_MENU_GAP;
  const viewportPadding = options?.viewportPadding ?? FLOATING_VIEWPORT_PADDING;
  const preferredMaxHeight = options?.preferredMaxHeight ?? 240;

  const left = triggerRect.left;
  const minWidth = triggerRect.width;
  const maxWidth = Math.max(minWidth, window.innerWidth - left - viewportPadding);

  const spaceBelow = window.innerHeight - triggerRect.bottom - gap - viewportPadding;
  const spaceAbove = triggerRect.top - gap - viewportPadding;

  let placement: FloatingPlacement = spaceBelow >= spaceAbove ? "bottom" : "top";

  const estimatedHeight = Math.min(menuHeight || preferredMaxHeight, preferredMaxHeight);
  if (placement === "bottom" && estimatedHeight > spaceBelow && spaceAbove > spaceBelow) {
    placement = "top";
  } else if (placement === "top" && estimatedHeight > spaceAbove && spaceBelow >= spaceAbove) {
    placement = "bottom";
  }

  const maxHeight = Math.max(80, Math.min(preferredMaxHeight, placement === "bottom" ? spaceBelow : spaceAbove));
  const effectiveHeight = Math.min(menuHeight || maxHeight, maxHeight);

  const top =
    placement === "bottom" ? triggerRect.bottom + gap : triggerRect.top - gap - effectiveHeight;

  return { top, left, minWidth, maxWidth, maxHeight, placement };
}
