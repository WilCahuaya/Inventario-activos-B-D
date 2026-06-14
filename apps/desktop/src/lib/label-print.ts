import type { Activo, Entidad } from "@inventario/types";
import {
  labelZplInputFromActivo,
  labelZplInputsFromActivos,
  type LabelActivoPrintSource,
  type LabelNombreSource,
  type LabelZplInput,
} from "@shared/print/label-zpl";
import type { ActivoConUbicacion } from "./activos";

export type { LabelActivoPrintSource, LabelNombreSource, LabelZplInput };
export { labelZplInputFromActivo, labelZplInputsFromActivos };

export function entidadLabelSource(
  entidad?: Pick<Entidad, "nombre" | "nombre_etiqueta"> | null,
  fallbackNombre = "",
): LabelNombreSource {
  return {
    nombre: entidad?.nombre ?? fallbackNombre,
    nombre_etiqueta: entidad?.nombre_etiqueta ?? null,
  };
}

export function activoPrintSource(
  activo: Pick<
    Activo,
    "nombre" | "nombre_etiqueta" | "codigo_barras" | "codigo_catalogo" | "fecha_adquisicion"
  >,
): LabelActivoPrintSource {
  return {
    nombre: activo.nombre,
    nombre_etiqueta: activo.nombre_etiqueta,
    codigo_barras: activo.codigo_barras ?? activo.codigo_catalogo,
    fecha_adquisicion: activo.fecha_adquisicion,
  };
}

export function labelZplInputForActivo(
  activo: ActivoConUbicacion,
  entidad?: Pick<Entidad, "nombre" | "nombre_etiqueta"> | null,
): LabelZplInput {
  return labelZplInputFromActivo(activoPrintSource(activo), entidadLabelSource(entidad, activo.entidad_nombre));
}

export function labelZplInputsForActivos(
  activos: ActivoConUbicacion[],
  entidad?: Pick<Entidad, "nombre" | "nombre_etiqueta"> | null,
): LabelZplInput[] {
  const entidadSrc = entidadLabelSource(entidad, activos[0]?.entidad_nombre);
  return labelZplInputsFromActivos(
    activos.map((activo) => activoPrintSource(activo)),
    entidadSrc,
  );
}
