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
  const soloTelefono = Boolean(responsable?.es_administrador);

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}_nombre`}>Nombre completo</Label>
        <Input
          id={`${idPrefix}_nombre`}
          name={soloTelefono ? undefined : "nombre"}
          required={!soloTelefono}
          readOnly={soloTelefono}
          disabled={soloTelefono}
          placeholder="Ej. Juan Pérez García"
          defaultValue={responsable?.nombre ?? ""}
          className={soloTelefono ? "bg-muted/50" : undefined}
        />
        {soloTelefono && <input type="hidden" name="nombre" value={responsable?.nombre ?? ""} />}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}_dni`}>DNI</Label>
        <Input
          id={`${idPrefix}_dni`}
          name={soloTelefono ? undefined : "dni"}
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          title="8 dígitos (opcional)"
          placeholder="Opcional"
          defaultValue={responsable?.dni ?? ""}
          readOnly={soloTelefono}
          disabled={soloTelefono}
          className={soloTelefono ? "bg-muted/50" : undefined}
        />
        {soloTelefono && <input type="hidden" name="dni" value={responsable?.dni ?? ""} />}
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
          name={soloTelefono ? undefined : "email"}
          type="email"
          placeholder="Opcional"
          title="Formato de correo válido"
          defaultValue={responsable?.email ?? ""}
          readOnly={soloTelefono}
          disabled={soloTelefono}
          className={soloTelefono ? "bg-muted/50" : undefined}
        />
        {soloTelefono && <input type="hidden" name="email" value={responsable?.email ?? ""} />}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}_telefono`}>Teléfono</Label>
        <Input
          id={`${idPrefix}_telefono`}
          name="telefono"
          inputMode="numeric"
          maxLength={9}
          placeholder="9 dígitos (opcional)"
          title="Celular Perú: 9 dígitos"
          defaultValue={responsable?.telefono ?? ""}
        />
        {soloTelefono && (
          <p className="text-xs text-muted-foreground">
            Como administrador solo puede editar el teléfono. Nombre, DNI y correo los gestiona el
            contador en la ficha de la entidad.
          </p>
        )}
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
