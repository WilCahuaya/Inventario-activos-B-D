"use client";

import type { CreateCatalogoNacionalInput } from "@inventario/types";
import { CatalogoAltaPanel } from "@inventario/ui";
import { createCatalogoNacional } from "@/lib/actions/catalogo";

interface CatalogoPanelProps {
  initialDenominacion?: string;
  initialCodigo?: string;
}

export function CatalogoPanel({ initialDenominacion = "", initialCodigo = "" }: CatalogoPanelProps) {
  async function handleSubmit(input: CreateCatalogoNacionalInput) {
    return createCatalogoNacional(input);
  }

  return (
    <CatalogoAltaPanel
      initialDenominacion={initialDenominacion}
      initialCodigo={initialCodigo}
      successSuffix="En desktop, sincronice el catálogo al reconectar."
      onSubmit={handleSubmit}
    />
  );
}
