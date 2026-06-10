"use client";

import { useState } from "react";
import type { CatalogoNacional, CreateCatalogoNacionalInput } from "@inventario/types";
import { CatalogoNacionalForm } from "./catalogo-nacional-form";
import { panelCardClass } from "./panel";

export interface CatalogoAltaPanelProps {
  initialDenominacion?: string;
  initialCodigo?: string;
  /** Texto adicional tras crear el ítem (ej. mensaje offline en desktop). */
  successSuffix?: string;
  onSubmit: (
    input: CreateCatalogoNacionalInput,
  ) => Promise<{ data?: CatalogoNacional; error?: string }>;
}

export function CatalogoAltaPanel({
  initialDenominacion = "",
  initialCodigo = "",
  successSuffix,
  onSubmit,
}: CatalogoAltaPanelProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [created, setCreated] = useState<CatalogoNacional | null>(null);

  async function handleSubmit(input: CreateCatalogoNacionalInput) {
    setPending(true);
    setError(null);
    setSuccess(null);
    setCreated(null);

    const result = await onSubmit(input);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setCreated(result.data ?? null);
    setSuccess(
      `Ítem ${result.data?.codigo} agregado. Ya puede usarlo al registrar activos.${successSuffix ? ` ${successSuffix}` : ""}`,
    );
  }

  return (
    <div className="space-y-4">
      <div className={`${panelCardClass} space-y-4 p-4 sm:p-6`}>
        <div>
          <h3 className="font-semibold">Nuevo ítem en catálogo nacional</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Use esto cuando el bien no aparece en el catálogo oficial (ej. cuchara, olla, sartén
            doméstica). Elija una plantilla, asigne un código de 8 dígitos único y guarde.
          </p>
        </div>

        <CatalogoNacionalForm
          initialDenominacion={initialDenominacion}
          initialCodigo={initialCodigo}
          pending={pending}
          onSubmit={handleSubmit}
        />

        {success && (
          <p className="rounded-lg border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-100">
            {success}
            {created && (
              <>
                {" "}
                <strong className="font-mono">{created.codigo}</strong> — {created.denominacion}
              </>
            )}
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <div className={`${panelCardClass} p-4 text-sm text-muted-foreground`}>
        <p className="font-medium text-foreground">Consejos para el código</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            Copie el prefijo de un ítem similar (ej. cocina mobiliario: <code>3264xxxx</code>).
          </li>
          <li>Verifique que los 8 dígitos no existan ya en el catálogo.</li>
          <li>
            Use <strong>EXCLUIDO</strong> para bienes de cuenta de orden (cuchara, sartén barata).
          </li>
          <li>
            Use <strong>ACTIVO</strong> y depreciación <strong>10 %</strong> si capitaliza como
            activo.
          </li>
        </ul>
      </div>
    </div>
  );
}
