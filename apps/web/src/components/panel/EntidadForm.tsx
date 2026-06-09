"use client";

import { useState } from "react";
import { Button, Input, Label } from "@inventario/ui";
import { createEntidad } from "@/lib/actions/entidades";

export function EntidadForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setMessage(null);
    const result = await createEntidad(formData);
    setPending(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setMessage("Entidad creada correctamente.");
    (document.getElementById("entidad-form") as HTMLFormElement)?.reset();
  }

  return (
    <form id="entidad-form" action={handleSubmit} className="space-y-4 rounded-lg border bg-card p-4">
      <p className="text-sm font-medium">Nueva entidad</p>
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" name="nombre" required placeholder="Ej. Municipalidad de Huancayo" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ruc">RUC (opcional)</Label>
        <Input id="ruc" name="ruc" placeholder="20XXXXXXXXX" />
      </div>
      {message && (
        <p className={`text-sm ${message.includes("correctamente") ? "text-primary" : "text-destructive"}`}>
          {message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Crear entidad"}
      </Button>
    </form>
  );
}
