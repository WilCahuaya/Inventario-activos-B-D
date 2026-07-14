"use client";

import type { CreateResponsableInput, ResponsableConConteo } from "@inventario/types";
import { RESPONSABLE_CARGO_DEFAULT } from "@inventario/types";
import { Input, Label } from "./components";

function cargoDisplay(responsable?: ResponsableConConteo): string {
  if (responsable?.es_administrador) {
    return responsable.cargo ?? "Administrador";
  }
  return responsable?.cargo ?? RESPONSABLE_CARGO_DEFAULT;
}

export function ResponsableFormFields({
  responsable,
  idPrefix,
}: {
  responsable?: ResponsableConConteo;
  idPrefix: string;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}_nombre`}>Nombre completo</Label>
        <Input
          id={`${idPrefix}_nombre`}
          name="nombre"
          required
          placeholder="Ej. Juan Pérez García"
          defaultValue={responsable?.nombre ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}_dni`}>DNI</Label>
        <Input
          id={`${idPrefix}_dni`}
          name="dni"
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          title="8 dígitos (opcional)"
          placeholder="Opcional"
          defaultValue={responsable?.dni ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}_cargo`}>Cargo</Label>
        <Input
          id={`${idPrefix}_cargo`}
          value={cargoDisplay(responsable)}
          readOnly
          disabled
          className="bg-muted/50"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}_email`}>Correo</Label>
        <Input
          id={`${idPrefix}_email`}
          name="email"
          type="email"
          placeholder="Opcional"
          defaultValue={responsable?.email ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}_telefono`}>Teléfono</Label>
        <Input
          id={`${idPrefix}_telefono`}
          name="telefono"
          placeholder="Opcional"
          defaultValue={responsable?.telefono ?? ""}
        />
      </div>
    </>
  );
}

export function responsableFromForm(form: FormData): CreateResponsableInput {
  return {
    nombre: String(form.get("nombre") || ""),
    dni: String(form.get("dni") || ""),
    email: String(form.get("email") || ""),
    telefono: String(form.get("telefono") || ""),
  };
}
