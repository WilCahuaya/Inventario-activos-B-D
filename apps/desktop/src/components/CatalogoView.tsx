import type { CreateCatalogoNacionalInput } from "@inventario/types";
import { CatalogoAltaPanel } from "@inventario/ui";
import { useOnline } from "../hooks/useOnline";
import { createCatalogoNacional } from "../lib/catalogo";

interface CatalogoViewProps {
  initialDenominacion?: string;
  initialCodigo?: string;
}

export function CatalogoView({
  initialDenominacion = "",
  initialCodigo = "",
}: CatalogoViewProps) {
  const online = useOnline();

  async function handleSubmit(input: CreateCatalogoNacionalInput) {
    if (!online) {
      return {
        error: "Se requiere conexión a internet para agregar ítems al catálogo nacional.",
      };
    }
    return createCatalogoNacional(input);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Catálogo nacional</h2>
        <p className="text-sm text-muted-foreground">
          Agregar ítems que no existen en la base oficial (cuchara, olla, sartén, etc.)
        </p>
      </div>

      {!online && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-foreground">
          Sin conexión. Puede buscar ítems ya sincronizados al registrar activos; para agregar uno
          nuevo al catálogo necesita internet.
        </p>
      )}

      <CatalogoAltaPanel
        initialDenominacion={initialDenominacion}
        initialCodigo={initialCodigo}
        successSuffix="Quedó disponible offline en este equipo."
        onSubmit={handleSubmit}
      />
    </div>
  );
}
