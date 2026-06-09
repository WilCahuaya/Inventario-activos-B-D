"use client";

import { useEffect, useMemo, useState } from "react";
import type { Ambiente, CatalogoNacional, CategoriaBien, Entidad, Sede } from "@inventario/types";
import {
  CATEGORIA_BIEN_LABELS,
  buildNombreConsolidado,
  calcDepreciacionAcumulada,
  calcPeriodoMeses,
  calcValorNeto,
} from "@inventario/types";
import { Button, Input, Label } from "@inventario/ui";
import { createActivo, previewCodigoBarras, updateActivoPaths } from "@/lib/actions/activos";
import { createAmbiente, createSede, listAmbientes, listSedes } from "@/lib/actions/ubicacion";
import { uploadActivoFile } from "@/lib/upload-activo-file";
import { CatalogoPicker } from "./CatalogoPicker";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

const textareaClass =
  "flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface ActivoFormProps {
  entidades: Entidad[];
  fixedEntidadId?: string;
  submitLabel?: string;
  /** Contador asigna correlativo al crear; admin preregistra sin código */
  asignaCodigoInmediato?: boolean;
}

function formatSoles(value: number | null) {
  if (value == null) return "—";
  return `S/ ${value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ActivoForm({
  entidades,
  fixedEntidadId,
  submitLabel = "Registrar activo",
  asignaCodigoInmediato = true,
}: ActivoFormProps) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [catalogo, setCatalogo] = useState<CatalogoNacional | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [caracteristicas, setCaracteristicas] = useState("");
  const [categoria, setCategoria] = useState<CategoriaBien>("ACTIVO");
  const [estadoBien, setEstadoBien] = useState<"BUENO" | "REGULAR" | "MALO">("BUENO");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [serie, setSerie] = useState("");
  const [color, setColor] = useState("");
  const [medidaLargo, setMedidaLargo] = useState("");
  const [medidaAncho, setMedidaAncho] = useState("");
  const [medidaAltura, setMedidaAltura] = useState("");
  const [depreciacion, setDepreciacion] = useState("");
  const [vidaUtilMeses, setVidaUtilMeses] = useState("");
  const [valor, setValor] = useState("");
  const [valorEsMercado, setValorEsMercado] = useState(false);
  const [fechaAdquisicion, setFechaAdquisicion] = useState("");
  const [responsable, setResponsable] = useState("");
  const [observacion, setObservacion] = useState("");
  const [entidadId, setEntidadId] = useState(fixedEntidadId ?? "");
  const [codigoBarrasPreview, setCodigoBarrasPreview] = useState<string | null>(null);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [sedeId, setSedeId] = useState("");
  const [ambienteId, setAmbienteId] = useState("");
  const [nuevaSede, setNuevaSede] = useState("");
  const [nuevoAmbiente, setNuevoAmbiente] = useState("");
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);

  const entidadEfectiva = fixedEntidadId ?? entidadId;

  useEffect(() => {
    if (catalogo) {
      setNombre(catalogo.denominacion);
      if (catalogo.depreciacion) setDepreciacion(catalogo.depreciacion);
    }
  }, [catalogo?.codigo]);

  useEffect(() => {
    if (!entidadEfectiva || !catalogo?.codigo || !asignaCodigoInmediato) {
      setCodigoBarrasPreview(null);
      return;
    }
    void previewCodigoBarras(entidadEfectiva, catalogo.codigo).then(setCodigoBarrasPreview);
  }, [entidadEfectiva, catalogo?.codigo, asignaCodigoInmediato]);

  useEffect(() => {
    if (!entidadEfectiva) {
      setSedes([]);
      setSedeId("");
      return;
    }
    void listSedes(entidadEfectiva).then((data) => {
      setSedes(data);
      if (data.length === 1) setSedeId(data[0].id);
    });
  }, [entidadEfectiva]);

  useEffect(() => {
    if (!sedeId) {
      setAmbientes([]);
      setAmbienteId("");
      return;
    }
    void listAmbientes(sedeId).then(setAmbientes);
  }, [sedeId]);

  const periodoMeses = useMemo(() => calcPeriodoMeses(fechaAdquisicion || null), [fechaAdquisicion]);
  const valorNum = valor ? Number(valor) : null;
  const vidaUtilNum = vidaUtilMeses ? Number(vidaUtilMeses) : null;
  const depreciacionAcumulada = useMemo(
    () => calcDepreciacionAcumulada(valorNum, vidaUtilNum, periodoMeses),
    [valorNum, vidaUtilNum, periodoMeses],
  );
  const valorNeto = useMemo(
    () => calcValorNeto(valorNum, depreciacionAcumulada),
    [valorNum, depreciacionAcumulada],
  );
  const nombreConsolidado = useMemo(
    () => buildNombreConsolidado(nombre, descripcion, caracteristicas),
    [nombre, descripcion, caracteristicas],
  );

  function resetFormulario() {
    setCatalogo(null);
    setNombre("");
    setDescripcion("");
    setCaracteristicas("");
    setCategoria("ACTIVO");
    setEstadoBien("BUENO");
    setMarca("");
    setModelo("");
    setSerie("");
    setColor("");
    setMedidaLargo("");
    setMedidaAncho("");
    setMedidaAltura("");
    setDepreciacion("");
    setVidaUtilMeses("");
    setValor("");
    setValorEsMercado(false);
    setFechaAdquisicion("");
    setResponsable("");
    setObservacion("");
    setAmbienteId("");
    setComprobanteFile(null);
    setCodigoBarrasPreview(null);
  }

  async function handleCrearSede() {
    if (!entidadEfectiva || !nuevaSede.trim()) return;
    const result = await createSede(entidadEfectiva, nuevaSede);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setSedes((prev) => [...prev, result.data!]);
    setSedeId(result.data!.id);
    setNuevaSede("");
  }

  async function handleCrearAmbiente() {
    if (!sedeId || !nuevoAmbiente.trim()) return;
    const result = await createAmbiente(sedeId, nuevoAmbiente);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setAmbientes((prev) => [...prev, result.data!]);
    setAmbienteId(result.data!.id);
    setNuevoAmbiente("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    if (!catalogo) {
      setPending(false);
      setMessage("Seleccione un ítem del catálogo nacional.");
      return;
    }

    if (!entidadEfectiva) {
      setPending(false);
      setMessage("Seleccione la entidad.");
      return;
    }

    const result = await createActivo({
      entidad_id: entidadEfectiva,
      codigo_catalogo: catalogo.codigo,
      nombre: nombre.trim() || catalogo.denominacion,
      descripcion: descripcion || undefined,
      caracteristicas: caracteristicas || undefined,
      categoria,
      estado_bien: estadoBien,
      marca: marca || undefined,
      modelo: modelo || undefined,
      serie: serie || undefined,
      color: color || undefined,
      medida_largo: medidaLargo ? Number(medidaLargo) : undefined,
      medida_ancho: medidaAncho ? Number(medidaAncho) : undefined,
      medida_altura: medidaAltura ? Number(medidaAltura) : undefined,
      depreciacion: depreciacion || undefined,
      observacion: observacion || undefined,
      responsable: responsable || undefined,
      valor_adquisicion: valor ? Number(valor) : undefined,
      valor_es_mercado: valorEsMercado,
      fecha_adquisicion: fechaAdquisicion || undefined,
      vida_util_meses: vidaUtilMeses ? Number(vidaUtilMeses) : undefined,
      sede_id: sedeId || undefined,
      ambiente_id: ambienteId || undefined,
    });

    if (result.error) {
      setPending(false);
      setMessage(result.error);
      return;
    }

    if (comprobanteFile && result.data?.id) {
      const upload = await uploadActivoFile(entidadEfectiva, result.data.id, comprobanteFile, "comprobante");
      if (upload.path) {
        await updateActivoPaths(result.data.id, { comprobante_path: upload.path });
      }
    }

    setPending(false);
    setMessage(
      result.data?.estado_registro === "REGISTRADO"
        ? `Activo registrado. Código: ${result.data.codigo_barras ?? codigoBarrasPreview ?? "—"}`
        : "Activo preregistrado. Pendiente de validación del contador.",
    );
    resetFormulario();
    event.currentTarget.reset();
  }

  return (
    <form onSubmit={handleSubmit} className="relative space-y-6 overflow-visible rounded-lg border bg-card p-4">
      <p className="text-sm font-medium">Nuevo activo</p>

      {/* Identificación */}
      <fieldset className="space-y-4 rounded-md border border-border/60 p-4">
        <legend className="px-1 text-sm font-medium">Identificación</legend>

        {!fixedEntidadId && (
          <div className="space-y-2">
            <Label htmlFor="entidad_id">Entidad</Label>
            <select
              id="entidad_id"
              required
              className={selectClass}
              value={entidadId}
              onChange={(e) => setEntidadId(e.target.value)}
            >
              <option value="">Seleccione…</option>
              {entidades.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        <CatalogoPicker
          selectedCodigo={catalogo?.codigo}
          disabled={pending}
          onSelect={setCatalogo}
          onClear={() => {
            setCatalogo(null);
            setNombre("");
            setDepreciacion("");
          }}
        />

        <div className="space-y-2">
          <Label>Código de barras</Label>
          <Input
            readOnly
            value={
              asignaCodigoInmediato
                ? codigoBarrasPreview ?? "Seleccione catálogo y entidad…"
                : "Se asignará al validar (contador)"
            }
            className="bg-muted font-mono text-sm"
          />
        </div>

        <div className="space-y-3">
          <Label>Categoría</Label>
          {(["ACTIVO", "CUENTA_ORDEN"] as const).map((key) => (
            <label key={key} className="flex cursor-pointer gap-3 rounded-md border p-3 has-[:checked]:border-primary">
              <input
                type="radio"
                name="categoria"
                value={key}
                checked={categoria === key}
                onChange={() => setCategoria(key)}
                className="mt-1"
              />
              <span className="text-sm">
                <strong>{CATEGORIA_BIEN_LABELS[key].titulo}</strong>
                <span className="mt-1 block text-muted-foreground">
                  {CATEGORIA_BIEN_LABELS[key].descripcion}
                </span>
              </span>
            </label>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre del bien</Label>
          <Input
            id="nombre"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Nombre consolidado</Label>
          <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            {nombreConsolidado || "—"}
          </p>
        </div>
      </fieldset>

      {/* Descripción */}
      <fieldset className="space-y-4 rounded-md border border-border/60 p-4">
        <legend className="px-1 text-sm font-medium">Descripción y características (opcional)</legend>
        <div className="space-y-2">
          <Label htmlFor="descripcion">Descripción</Label>
          <textarea
            id="descripcion"
            className={textareaClass}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Uso, ubicación física, detalle general…"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="caracteristicas">Características del bien</Label>
          <textarea
            id="caracteristicas"
            className={textareaClass}
            value={caracteristicas}
            onChange={(e) => setCaracteristicas(e.target.value)}
            placeholder="Material, capacidad, accesorios…"
          />
        </div>
      </fieldset>

      {/* Detalle físico */}
      <fieldset className="space-y-4 rounded-md border border-border/60 p-4">
        <legend className="px-1 text-sm font-medium">Detalle del bien</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="marca">Marca</Label>
            <Input id="marca" value={marca} onChange={(e) => setMarca(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="modelo">Modelo</Label>
            <Input id="modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="serie">Serie</Label>
            <Input id="serie" value={serie} onChange={(e) => setSerie(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Input id="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Medidas (Largo × Ancho × Altura) cm</Label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Largo"
              value={medidaLargo}
              onChange={(e) => setMedidaLargo(e.target.value)}
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Ancho"
              value={medidaAncho}
              onChange={(e) => setMedidaAncho(e.target.value)}
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Altura"
              value={medidaAltura}
              onChange={(e) => setMedidaAltura(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="estado_bien">Estado del bien</Label>
          <select
            id="estado_bien"
            className={selectClass}
            value={estadoBien}
            onChange={(e) => setEstadoBien(e.target.value as typeof estadoBien)}
          >
            <option value="BUENO">Bueno</option>
            <option value="REGULAR">Regular</option>
            <option value="MALO">Malo</option>
          </select>
        </div>
      </fieldset>

      {/* Valoración */}
      <fieldset className="space-y-4 rounded-md border border-border/60 p-4">
        <legend className="px-1 text-sm font-medium">Valoración y depreciación</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="valor">
              {valorEsMercado ? "Valor de mercado (S/)" : "Precio de adquisición (S/)"}
            </Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              min="0"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2 pb-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={valorEsMercado}
                onChange={(e) => setValorEsMercado(e.target.checked)}
              />
              Usar valor de mercado (sin factura)
            </label>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fecha_adquisicion">Fecha de adquisición</Label>
            <Input
              id="fecha_adquisicion"
              type="date"
              value={fechaAdquisicion}
              onChange={(e) => setFechaAdquisicion(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comprobante">Comprobante de adquisición</Label>
            <Input
              id="comprobante"
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(e) => setComprobanteFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="depreciacion">Depreciación (catálogo, editable)</Label>
            <Input
              id="depreciacion"
              value={depreciacion}
              onChange={(e) => setDepreciacion(e.target.value)}
              placeholder="Del catálogo nacional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vida_util_meses">Vida útil (meses)</Label>
            <Input
              id="vida_util_meses"
              type="number"
              min="1"
              value={vidaUtilMeses}
              onChange={(e) => setVidaUtilMeses(e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-4 rounded-md bg-muted/50 p-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Periodo (meses)</p>
            <p className="font-medium">{fechaAdquisicion ? periodoMeses : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Depreciación acumulada</p>
            <p className="font-medium">{formatSoles(depreciacionAcumulada)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Valor neto</p>
            <p className="font-medium">{formatSoles(valorNeto)}</p>
          </div>
        </div>
      </fieldset>

      {/* Ubicación y responsable */}
      <fieldset className="space-y-4 rounded-md border border-border/60 p-4">
        <legend className="px-1 text-sm font-medium">Ubicación y responsable</legend>
        {sedes.length === 0 ? (
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Nombre de sede (ej. Sede principal)"
              value={nuevaSede}
              onChange={(e) => setNuevaSede(e.target.value)}
              className="max-w-xs"
            />
            <Button type="button" variant="secondary" onClick={handleCrearSede} disabled={!entidadEfectiva}>
              Crear sede
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="sede_id">Sede</Label>
            <select
              id="sede_id"
              className={selectClass}
              value={sedeId}
              onChange={(e) => setSedeId(e.target.value)}
            >
              <option value="">Seleccione…</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {sedeId && (
          <div className="space-y-2">
            <Label htmlFor="ambiente_id">Ambiente</Label>
            <select
              id="ambiente_id"
              className={selectClass}
              value={ambienteId}
              onChange={(e) => setAmbienteId(e.target.value)}
            >
              <option value="">Seleccione…</option>
              {ambientes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2 pt-1">
              <Input
                placeholder="Nuevo ambiente"
                value={nuevoAmbiente}
                onChange={(e) => setNuevoAmbiente(e.target.value)}
                className="max-w-xs"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleCrearAmbiente}>
                Agregar ambiente
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="responsable">Responsable</Label>
          <Input
            id="responsable"
            value={responsable}
            onChange={(e) => setResponsable(e.target.value)}
            placeholder="Persona a cargo del bien"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="observacion">Observación</Label>
          <textarea
            id="observacion"
            className={textareaClass}
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
          />
        </div>
      </fieldset>

      {message && (
        <p
          className={`text-sm ${message.includes("Error") || message.includes("obligator") || message.includes("Seleccione") ? "text-destructive" : "text-primary"}`}
        >
          {message}
        </p>
      )}

      <Button type="submit" disabled={pending || !catalogo}>
        {pending ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}
