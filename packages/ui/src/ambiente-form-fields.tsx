"use client";

import { useEffect, useMemo, useState } from "react";
import type { Ambiente, Responsable, SedeConConteo } from "@inventario/types";
import { Button, Input, Label, Select, Textarea } from "./components";

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
  responsableId,
  onResponsableIdChange,
  onRequestCreateResponsable,
}: {
  ambiente?: AmbienteFormAmbiente;
  sedes: Array<SedeConConteo | { id: string; nombre: string; es_principal?: boolean }>;
  responsables: Responsable[];
  defaultSedeId?: string;
  showSedeSelect?: boolean;
  responsableId: string;
  onResponsableIdChange: (id: string) => void;
  onRequestCreateResponsable?: () => void;
}) {
  const [nombre, setNombre] = useState(ambiente?.nombre ?? "");

  useEffect(() => {
    setNombre(ambiente?.nombre ?? "");
  }, [ambiente?.nombre, ambiente?.responsable_id]);

  const activos = useMemo(
    () => responsables.filter((r) => r.activo),
    [responsables],
  );

  const puedeElegirResponsable = Boolean(ambiente) || nombre.trim().length > 0;

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
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoFocus={!ambiente}
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
      <div
        className={
          puedeElegirResponsable ? "space-y-2" : "space-y-2 opacity-60"
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="amb_responsable_id">Responsable del ambiente</Label>
          {onRequestCreateResponsable && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={!puedeElegirResponsable}
              onClick={onRequestCreateResponsable}
            >
              + Nuevo responsable
            </Button>
          )}
        </div>
        <Select
          id="amb_responsable_id"
          name="responsable_id"
          value={responsableId}
          onChange={onResponsableIdChange}
          disabled={!puedeElegirResponsable}
          options={[
            { value: "", label: "Sin responsable asignado" },
            ...activos.map((r) => ({
              value: r.id,
              label: `${r.nombre}${r.cargo ? ` — ${r.cargo}` : ""}`,
            })),
          ]}
        />
        {!puedeElegirResponsable && (
          <p className="text-xs text-muted-foreground">
            Escriba primero el nombre del ambiente para asignar un responsable.
          </p>
        )}
        {puedeElegirResponsable && activos.length === 0 && !onRequestCreateResponsable && (
          <p className="text-xs text-muted-foreground">
            Registre responsables en la pestaña «Responsables» antes de asignarlos.
          </p>
        )}
        {puedeElegirResponsable && activos.length === 0 && onRequestCreateResponsable && (
          <p className="text-xs text-muted-foreground">
            No hay responsables registrados. Use «+ Nuevo responsable» para crear uno.
          </p>
        )}
      </div>
    </>
  );
}
