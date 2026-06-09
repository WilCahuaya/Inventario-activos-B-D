"use client";

import type { SedeConConteo } from "@inventario/types";
import { Input, Label } from "@inventario/ui";
import type { AmbienteConSede } from "@/lib/actions/ubicacion";

const textareaClass =
  "flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ambienteFromForm(form: FormData) {
  return {
    sedeId: String(form.get("sede_id") || ""),
    nombre: String(form.get("nombre")),
    descripcion: String(form.get("descripcion") || ""),
    responsable: String(form.get("responsable") || ""),
  };
}

export function AmbienteFormFields({
  ambiente,
  sedes,
  defaultSedeId,
  showSedeSelect,
}: {
  ambiente?: AmbienteConSede;
  sedes: SedeConConteo[];
  defaultSedeId?: string;
  showSedeSelect?: boolean;
}) {
  return (
    <>
      {showSedeSelect && (
        <div className="space-y-2">
          <Label htmlFor="amb_sede">Sucursal</Label>
          <select
            id="amb_sede"
            name="sede_id"
            required
            defaultValue={defaultSedeId ?? sedes.find((s) => s.es_principal)?.id ?? ""}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {sedes.map((sede) => (
              <option key={sede.id} value={sede.id}>
                {sede.nombre}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="amb_nombre">Nombre del ambiente</Label>
        <Input
          id="amb_nombre"
          name="nombre"
          required
          placeholder="Ej. Almacén central"
          defaultValue={ambiente?.nombre ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="amb_descripcion">Descripción</Label>
        <textarea
          id="amb_descripcion"
          name="descripcion"
          className={textareaClass}
          placeholder="Opcional"
          defaultValue={ambiente?.descripcion ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="amb_responsable">Responsable</Label>
        <Input
          id="amb_responsable"
          name="responsable"
          placeholder="Persona a cargo del ambiente"
          defaultValue={ambiente?.responsable ?? ""}
        />
      </div>
    </>
  );
}
