import { CatalogoPage } from "@inventario/ui";
import { useOnline } from "../hooks/useOnline";
import {
  createCatalogoNacional,
  deleteCatalogoOpcionPersonalizada,
  deleteCatalogoPropio,
  getNextCodigoCatalogoPropio,
  listCatalogoClases,
  listCatalogoGrupos,
  listCatalogoPropio,
  registerCatalogoOpcionPersonalizada,
  searchCatalogoNacionalOficial,
  suggestCatalogoGrupo,
  updateCatalogoPropio,
  updateCatalogoNacionalContabilidad,
} from "../lib/catalogo";

interface CatalogoViewProps {
  initialDenominacion?: string;
}

export function CatalogoView({ initialDenominacion = "" }: CatalogoViewProps) {
  const online = useOnline();

  async function handleCreate(
    ...args: Parameters<typeof createCatalogoNacional>
  ) {
    if (!online) {
      return {
        error: "Se requiere conexión a internet para agregar ítems al catálogo.",
      };
    }
    return createCatalogoNacional(...args);
  }

  async function handleUpdate(
    ...args: Parameters<typeof updateCatalogoPropio>
  ) {
    if (!online) {
      return { error: "Se requiere conexión para editar el catálogo propio." };
    }
    return updateCatalogoPropio(...args);
  }

  async function handleUpdateNacionalContabilidad(
    ...args: Parameters<typeof updateCatalogoNacionalContabilidad>
  ) {
    if (!online) {
      return {
        error: "Se requiere conexión para editar la contabilidad del catálogo nacional.",
      };
    }
    return updateCatalogoNacionalContabilidad(...args);
  }

  async function handleDelete(codigo: string) {
    if (!online) {
      return { error: "Se requiere conexión para eliminar del catálogo propio." };
    }
    return deleteCatalogoPropio(codigo);
  }

  async function handleDeleteOpcion(
    ...args: Parameters<typeof deleteCatalogoOpcionPersonalizada>
  ) {
    if (!online) {
      return { error: "Se requiere conexión para eliminar opciones personalizadas." };
    }
    return deleteCatalogoOpcionPersonalizada(...args);
  }

  async function handleRegisterOpcion(
    ...args: Parameters<typeof registerCatalogoOpcionPersonalizada>
  ) {
    if (!online) {
      return { error: "Se requiere conexión para guardar opciones personalizadas." };
    }
    return registerCatalogoOpcionPersonalizada(...args);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Catálogo</h2>
        <p className="text-sm text-muted-foreground">
          Administre bienes de cuenta de orden (catálogo propio) y consulte el catálogo nacional
          oficial.
        </p>
      </div>

        {!online && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-foreground">
          Sin conexión. Puede consultar el catálogo nacional ya sincronizado y ver ítems propios en
          caché; crear, editar o eliminar propios y completar contabilidad nacional requiere
          internet.
        </p>
      )}

      <CatalogoPage
        initialDenominacion={initialDenominacion}
        successSuffix="Quedó disponible offline en este equipo."
        offlineHint={
          online
            ? undefined
            : "Mostrando resultados del catálogo nacional sincronizado en este equipo."
        }
        readOnlyPropio={!online}
        loadNextCodigo={getNextCodigoCatalogoPropio}
        loadGrupos={listCatalogoGrupos}
        loadClases={listCatalogoClases}
        suggestGrupo={suggestCatalogoGrupo}
        onRegisterOpcionPersonalizada={handleRegisterOpcion}
        onDeleteOpcionPersonalizada={handleDeleteOpcion}
        onCreate={handleCreate}
        listPropio={listCatalogoPropio}
        onUpdatePropio={handleUpdate}
        onDeletePropio={handleDelete}
        searchNacional={searchCatalogoNacionalOficial}
        onUpdateNacionalContabilidad={handleUpdateNacionalContabilidad}
        readOnlyNacionalContabilidad={!online}
      />
    </div>
  );
}
