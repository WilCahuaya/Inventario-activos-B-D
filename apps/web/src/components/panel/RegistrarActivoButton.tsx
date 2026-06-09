"use client";

import { Button } from "@inventario/ui";
import { registrarActivo } from "@/lib/actions/activos";

export function RegistrarActivoButton({ activoId }: { activoId: string }) {
  async function handleClick() {
    await registrarActivo(activoId);
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={handleClick}>
      Validar → REGISTRADO
    </Button>
  );
}
