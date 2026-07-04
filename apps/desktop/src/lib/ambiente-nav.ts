import type { FetchAmbientesPorSede } from "@inventario/ui/panel";
import { listAmbientesPorEntidad } from "./ubicacion";

export const fetchAmbientesPorSedeDesktop: FetchAmbientesPorSede = async (entidadId, sedeId) => {
  const list = await listAmbientesPorEntidad(entidadId, sedeId);
  return list.map((a) => ({ id: a.id, nombre: a.nombre }));
};
