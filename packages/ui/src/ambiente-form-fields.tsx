"use client";

import type { Ambiente, Responsable, SedeConConteo } from "@inventario/types";
import { Input, Label, Select, Textarea } from "./components";

export type AmbienteFormAmbiente = Pick<
  Ambiente,
  "nombre" | "descripcion" | "responsable_id" | "responsable"
>;

export function ambienteFromForm(form: FormData) {
  const responsableId = String(form.get("responsable_id") || "").trim();
  return {
    sedeId: String(form.get("sede_id") || ""),
    nombre: String(form.get("nombre")),
    descripcion: String(form.get("descripcion") || ""),
    responsableId: responsableId || null,
  };
}

export function AmbienteFormFields({
  ambiente,
  sedes,
  responsables,
  defaultSedeId,
  showSedeSelect,
}: {
  ambiente?: AmbienteFormAmbiente;
  sedes: Array<SedeConConteo | { id: string; nombre: string; es_principal?: boolean }>;
  responsables: Responsable[];
  defaultSedeId?: string;
  showSedeSelect?: boolean;
}) {
  const activos = responsables.filter((r) => r.activo);
  const selectedId = ambiente?.responsable_id ?? "";

  return (
    <>
      {showSedeSelect ? (
        <div className="space-y-2">
          <Label htmlFor="amb_sede">Sucursal</Label>
          <Select
            id="amb_sede"
            name="sede_id"
            required
            defaultValue={defaultSedeId ?? sedes.find((s) => s.es_principal)?.id ?? ""}
            options={sedes.map((sede) => ({ value: sede.id, label: sede.nombre }))}
          />
        </div>
      ) : defaultSedeId ? (
        <input type="hidden" name="sede_id" value={defaultSedeId} />
      ) : null}
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
        <Textarea
          id="amb_descripcion"
          name="descripcion"
          placeholder="Opcional"
          defaultValue={ambiente?.descripcion ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="amb_responsable_id">Responsable del ambiente</Label>
        <Select
          id="amb_responsable_id"
          name="responsable_id"
          defaultValue={selectedId}
          options={[
            { value: "", label: "Sin responsable asignado" },
            ...activos.map((r) => ({
              value: r.id,
              label: `${r.nombre}${r.cargo ? ` — ${r.cargo}` : ""}`,
            })),
          ]}
        />
        {activos.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Registre responsables en la pestaña «Responsables» antes de asignarlos.
          </p>
        )}
      </div>
    </>
  );
}
