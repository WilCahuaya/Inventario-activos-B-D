"use client";

import {
  AMBIENTE_BREADCRUMB_INDEX_AFTER_SEDE,
  withAmbienteBreadcrumbSelect,
  withSedeBreadcrumb,
  type PanelBreadcrumbItem,
} from "@inventario/ui/panel";
import { fetchAmbientesPorSedeDesktop } from "./ambiente-nav";

export type AmbienteNavContext = {
  entidadId: string;
  ambienteId: string;
  sedeId: string;
  sedeNombre?: string | null;
  ambienteNombre: string;
};

export function buildAmbienteContextBreadcrumbs({
  entidadLabel,
  onEntidadClick,
  context,
  sedeLink,
  trailing = [],
  onAmbienteNavigate,
}: {
  entidadLabel: string;
  onEntidadClick: () => void;
  context: AmbienteNavContext;
  sedeLink?: Pick<PanelBreadcrumbItem, "href" | "onClick">;
  trailing?: PanelBreadcrumbItem[];
  onAmbienteNavigate: (ambienteId: string, ambienteNombre: string) => void;
}): PanelBreadcrumbItem[] {
  const base = withSedeBreadcrumb(
    [
      { label: entidadLabel, onClick: onEntidadClick },
      { label: context.ambienteNombre },
      ...trailing,
    ],
    context.sedeNombre,
    1,
    sedeLink,
  );

  return withAmbienteBreadcrumbSelect(base, AMBIENTE_BREADCRUMB_INDEX_AFTER_SEDE, {
    entidadId: context.entidadId,
    sedeId: context.sedeId,
    ambienteId: context.ambienteId,
    ambienteNombre: context.ambienteNombre,
    onAmbienteChange: onAmbienteNavigate,
    fetchAmbientes: fetchAmbientesPorSedeDesktop,
  });
}
