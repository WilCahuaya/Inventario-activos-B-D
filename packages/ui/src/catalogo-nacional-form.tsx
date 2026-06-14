"use client";

import { useEffect, useState } from "react";
import {
  CATALOGO_ORIGEN_LABELS,
  CATALOGO_PLANTILLAS,
  type CatalogoEstadoSbn,
  type CreateCatalogoNacionalInput,
} from "@inventario/types";
import { Button, Input, Label } from "./components";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export interface CatalogoNacionalFormProps {
  initialDenominacion?: string;
  initialCodigo?: string;
  pending?: boolean;
  onSubmit: (input: CreateCatalogoNacionalInput) => void | Promise<void>;
}

const emptyForm = (denominacion = "", codigo = ""): CreateCatalogoNacionalInput => ({
  codigo,
  denominacion,
  grupo: "",
  clase: "",
  cuenta_codigo: "",
  contabilidad: "",
  depreciacion: "",
  resolucion: "",
  estado: "EXCLUIDO",
});

export function CatalogoNacionalForm({
  initialDenominacion = "",
  initialCodigo = "",
  pending = false,
  onSubmit,
}: CatalogoNacionalFormProps) {
  const [plantillaId, setPlantillaId] = useState(CATALOGO_PLANTILLAS[0]?.id ?? "");
  const [form, setForm] = useState(() => ({
    ...emptyForm(initialDenominacion, initialCodigo),
    ...CATALOGO_PLANTILLAS[0]?.values,
  }));

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      denominacion: initialDenominacion || prev.denominacion,
      codigo: initialCodigo || prev.codigo,
    }));
  }, [initialDenominacion, initialCodigo]);

  function applyPlantilla(id: string) {
    setPlantillaId(id);
    const plantilla = CATALOGO_PLANTILLAS.find((p) => p.id === id);
    if (!plantilla) return;
    setForm((prev) => ({
      ...prev,
      ...plantilla.values,
      depreciacion: plantilla.values.depreciacion ?? "",
      grupo: plantilla.values.grupo ?? "",
      clase: plantilla.values.clase ?? "",
      cuenta_codigo: plantilla.values.cuenta_codigo ?? "",
      contabilidad: plantilla.values.contabilidad ?? "",
      resolucion: plantilla.values.resolucion ?? "",
    }));
  }

  function updateField<K extends keyof CreateCatalogoNacionalInput>(
    key: K,
    value: CreateCatalogoNacionalInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(form);
      }}
    >
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="catalogo_plantilla">Plantilla (rellena campos contables)</Label>
        <select
          id="catalogo_plantilla"
          className={selectClass}
          value={plantillaId}
          onChange={(e) => applyPlantilla(e.target.value)}
          disabled={pending}
        >
          {CATALOGO_PLANTILLAS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Elija la plantilla más parecida (cocina, aseo, etc.) y ajuste solo código y nombre.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="catalogo_codigo">Código (8 dígitos)</Label>
        <Input
          id="catalogo_codigo"
          inputMode="numeric"
          pattern="\d{8}"
          maxLength={8}
          required
          value={form.codigo}
          disabled={pending}
          placeholder="32649910"
          className="font-mono"
          onChange={(e) => updateField("codigo", e.target.value.replace(/\D/g, "").slice(0, 8))}
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="catalogo_origen">Origen en catálogo</Label>
        <Input
          id="catalogo_origen"
          readOnly
          disabled
          value={CATALOGO_ORIGEN_LABELS.PROPIO}
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          Se asigna automáticamente al guardar. Los ítems del catálogo oficial SBN tienen origen
          nacional.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="catalogo_estado">Estado en catálogo</Label>
        <select
          id="catalogo_estado"
          className={selectClass}
          value={form.estado}
          disabled={pending}
          onChange={(e) => updateField("estado", e.target.value as CatalogoEstadoSbn)}
        >
          <option value="EXCLUIDO">EXCLUIDO — bienes menores / cuenta de orden</option>
          <option value="ACTIVO">ACTIVO — depreciable en catálogo</option>
        </select>
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="catalogo_denominacion">Denominación</Label>
        <Input
          id="catalogo_denominacion"
          required
          value={form.denominacion}
          disabled={pending}
          placeholder="CUCHARA DE COCINA"
          onChange={(e) => updateField("denominacion", e.target.value)}
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="catalogo_grupo">Grupo</Label>
        <Input
          id="catalogo_grupo"
          value={form.grupo ?? ""}
          disabled={pending}
          placeholder="32 COCINA Y COMEDOR"
          onChange={(e) => updateField("grupo", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="catalogo_clase">Clase</Label>
        <Input
          id="catalogo_clase"
          value={form.clase ?? ""}
          disabled={pending}
          placeholder="64 MOBILIARIO"
          onChange={(e) => updateField("clase", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="catalogo_cuenta">Cuenta contable (código)</Label>
        <Input
          id="catalogo_cuenta"
          value={form.cuenta_codigo ?? ""}
          disabled={pending}
          placeholder="33522"
          onChange={(e) => updateField("cuenta_codigo", e.target.value)}
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="catalogo_contabilidad">Contabilidad (texto)</Label>
        <Input
          id="catalogo_contabilidad"
          value={form.contabilidad ?? ""}
          disabled={pending}
          placeholder="33522 Enseres de cocina"
          onChange={(e) => updateField("contabilidad", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="catalogo_depreciacion">Depreciación</Label>
        <Input
          id="catalogo_depreciacion"
          value={form.depreciacion ?? ""}
          disabled={pending}
          placeholder="10 %"
          onChange={(e) => updateField("depreciacion", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="catalogo_resolucion">Resolución</Label>
        <Input
          id="catalogo_resolucion"
          value={form.resolucion ?? ""}
          disabled={pending}
          placeholder="0158-97/SBN"
          onChange={(e) => updateField("resolucion", e.target.value)}
        />
      </div>

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Agregar al catálogo nacional"}
        </Button>
      </div>
    </form>
  );
}
