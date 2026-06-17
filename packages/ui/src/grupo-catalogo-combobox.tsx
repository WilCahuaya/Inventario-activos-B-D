"use client";

import { CatalogoListaSelectField, type CatalogoListaSelectFieldProps } from "./catalogo-lista-select-field";

export type GrupoCatalogoComboboxProps = Omit<
  CatalogoListaSelectFieldProps,
  "label" | "opciones" | "emptyOptionLabel" | "confirmLabel" | "personalizadoTag" | "customHint" | "opcionTipo"
> & {
  label?: string;
  grupos: string[];
  opciones?: string[];
  personalizadas?: string[];
  suggestedGrupo?: string | null;
};

export function GrupoCatalogoCombobox({
  id = "catalogo_grupo",
  label = "Grupo",
  grupos,
  personalizadas = [],
  suggestedGrupo = null,
  helperText = "Seleccione un grupo de la lista o elija «Otros» para escribir uno personalizado.",
  opciones,
  suggestedValue,
  ...rest
}: GrupoCatalogoComboboxProps) {
  return (
    <CatalogoListaSelectField
      id={id}
      label={label}
      opciones={opciones ?? grupos}
      personalizadas={personalizadas}
      opcionTipo="grupo"
      suggestedValue={suggestedGrupo ?? suggestedValue ?? null}
      helperText={helperText}
      emptyOptionLabel="Seleccione un grupo"
      loadingLabel="Cargando grupos…"
      confirmLabel="Usar este grupo"
      personalizadoTag="grupo personalizado"
      customHint={
        <>
          Grupo personalizado. Ej.: <strong>99 MI GRUPO</strong>
        </>
      }
      customPlaceholder="99 MI GRUPO PERSONALIZADO"
      {...rest}
    />
  );
}
