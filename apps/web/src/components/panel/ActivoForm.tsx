"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Activo, Ambiente, CatalogoNacional, CategoriaBien, Entidad, Sede } from "@inventario/types";
import {
  CATEGORIA_BIEN_AYUDA,
  CATEGORIA_BIEN_LABELS,
  assessLabelPrintWarnings,
  buildNombreConsolidado,
  calcDepreciacionAcumulada,
  calcPeriodoMeses,
  calcValorNeto,
  formatFechaInputDDMMYYYY,
  formatFechaISOToDDMMYYYY,
  formatLabelPrintWarnings,
  formatPorcentajeDepreciacion,
  parseFechaDDMMYYYY,
  parsePorcentajeDepreciacion,
  porcentajeFromVidaUtilMeses,
  resolveNombreEtiqueta,
  suggestNombreEtiqueta,
  validarFechaDDMMYYYY,
  vidaUtilMesesFromPorcentaje,
} from "@inventario/types";
import {
  ActivoAtributoAutocomplete,
  Button,
  CatalogoPicker,
  CategoriaBienSelector,
  ConfirmDialog,
  Input,
  Label,
  LabelPrintTextPreview,
} from "@inventario/ui";
import {
  createActivo,
  previewCodigoBarras,
  cambiarUbicacionActivo,
  updateActivo,
  updateActivoPaths,
  type UpdateActivoInput,
} from "@/lib/actions/activos";
import { suggestActivoAtributo } from "@/lib/actions/atributo-vocab";
import { getCatalogoByCodigo, searchCatalogo } from "@/lib/actions/catalogo";
import { createAmbiente, createSede, listAmbientes, listSedes } from "@/lib/actions/ubicacion";
import { uploadActivoFile } from "@/lib/upload-activo-file";
import { ComprobanteSerieDialog } from "./ComprobanteSerieDialog";
import { panelFieldsetClass, panelLegendClass } from "./panel-ui";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

const textareaClass =
  "flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface ActivoFormProps {
  entidades: Entidad[];
  fixedEntidadId?: string;
  fixedSedeId?: string;
  fixedAmbienteId?: string;
  activo?: Activo;
  mode?: "create" | "edit";
  submitLabel?: string;
  /** Contador asigna correlativo al crear; admin preregistra sin código */
  asignaCodigoInmediato?: boolean;
  /** Admin entidad: en edición solo puede cambiar sede/ambiente */
  soloUbicacion?: boolean;
  variant?: "page" | "modal";
  onSuccess?: () => void;
}

function formatSoles(value: number | null) {
  if (value == null) return "—";
  return `S/ ${value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ActivoForm({
  entidades,
  fixedEntidadId,
  fixedSedeId,
  fixedAmbienteId,
  activo,
  mode = activo ? "edit" : "create",
  submitLabel = "Registrar activo",
  asignaCodigoInmediato = true,
  soloUbicacion = false,
  variant = "page",
  onSuccess,
}: ActivoFormProps) {
  const isEdit = mode === "edit" && Boolean(activo);
  const formRef = useRef<HTMLFormElement>(null);
  const soloUbicacionEdit = isEdit && soloUbicacion;
  /** Alta preregistro admin */
  const esPreregistro = !asignaCodigoInmediato && !isEdit;
  /** Preregistro admin (crear o editar PREREGISTRADO): sin depreciación ni vida útil */
  const esPreregistroAdmin =
    !asignaCodigoInmediato && (!isEdit || activo?.estado_registro === "PREREGISTRADO");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [catalogo, setCatalogo] = useState<CatalogoNacional | null>(null);
  const [nombre, setNombre] = useState("");
  const [nombreEtiqueta, setNombreEtiqueta] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState<CategoriaBien>("ACTIVO");
  const [estadoBien, setEstadoBien] = useState<"BUENO" | "REGULAR" | "MALO">("BUENO");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [serie, setSerie] = useState("");
  const [color, setColor] = useState("");
  const [medidas, setMedidas] = useState("");
  const [depreciacion, setDepreciacion] = useState("");
  const [vidaUtilMeses, setVidaUtilMeses] = useState("");
  const [valor, setValor] = useState("");
  const [valorEsMercado, setValorEsMercado] = useState(false);
  const [fechaAdquisicion, setFechaAdquisicion] = useState("");
  const [fechaAdquisicionError, setFechaAdquisicionError] = useState<string | null>(null);
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
  const [comprobanteSerie, setComprobanteSerie] = useState("");
  const [serieDialogOpen, setSerieDialogOpen] = useState(false);

  const searchAtributo = useCallback(
    (campo: "marca" | "modelo" | "serie" | "color", query: string) =>
      suggestActivoAtributo(campo, query),
    [],
  );
  const [pendingComprobanteFile, setPendingComprobanteFile] = useState<File | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [labelWarnOpen, setLabelWarnOpen] = useState(false);
  const [labelWarnText, setLabelWarnText] = useState("");

  const entidadEfectiva = fixedEntidadId ?? entidadId;
  const entidadSeleccionada = useMemo(
    () => entidades.find((e) => e.id === entidadEfectiva),
    [entidades, entidadEfectiva],
  );
  const entidadNombre = entidadSeleccionada?.nombre ?? "";
  const entidadEnEtiqueta = useMemo(
    () => resolveNombreEtiqueta(entidadNombre, entidadSeleccionada?.nombre_etiqueta),
    [entidadNombre, entidadSeleccionada?.nombre_etiqueta],
  );

  useEffect(() => {
    if (!activo || !isEdit) return;

    void getCatalogoByCodigo(activo.codigo_catalogo).then((item) => {
      if (item) setCatalogo(item);
    });

    setNombre(activo.nombre);
    setNombreEtiqueta(activo.nombre_etiqueta ?? "");
    setDescripcion(activo.descripcion ?? "");
    setCategoria(activo.categoria);
    setEstadoBien(activo.estado_bien);
    setMarca(activo.marca ?? "");
    setModelo(activo.modelo ?? "");
    setSerie(activo.serie ?? "");
    setColor(activo.color ?? "");
    setMedidas(activo.medidas ?? "");
    setDepreciacion(activo.depreciacion ?? "");
    setVidaUtilMeses(activo.vida_util_meses != null ? String(activo.vida_util_meses) : "");
    setValor(activo.valor_adquisicion != null ? String(activo.valor_adquisicion) : "");
    setValorEsMercado(activo.valor_es_mercado);
    setFechaAdquisicion(formatFechaISOToDDMMYYYY(activo.fecha_adquisicion));
    setObservacion(activo.observacion ?? "");
    setComprobanteSerie(activo.comprobante_serie ?? "");
    setCodigoBarrasPreview(activo.codigo_barras);
    if (activo.sede_id) setSedeId(activo.sede_id);
    if (activo.ambiente_id) setAmbienteId(activo.ambiente_id);
  }, [activo, isEdit]);

  useEffect(() => {
    if (catalogo) {
      setNombre(catalogo.denominacion);
      if (!esPreregistroAdmin && catalogo.depreciacion) {
        setDepreciacion(catalogo.depreciacion);
        const pct = parsePorcentajeDepreciacion(catalogo.depreciacion);
        if (pct) setVidaUtilMeses(String(vidaUtilMesesFromPorcentaje(pct)));
      }
    }
  }, [catalogo?.codigo, esPreregistroAdmin]);

  function handleDepreciacionChange(value: string) {
    setDepreciacion(value);
    const pct = parsePorcentajeDepreciacion(value);
    if (pct) setVidaUtilMeses(String(vidaUtilMesesFromPorcentaje(pct)));
  }

  function handleVidaUtilChange(value: string) {
    setVidaUtilMeses(value);
    const meses = Number(value);
    if (value && !Number.isNaN(meses) && meses > 0) {
      setDepreciacion(formatPorcentajeDepreciacion(porcentajeFromVidaUtilMeses(meses)));
    }
  }

  function handleFechaAdquisicionChange(value: string) {
    setFechaAdquisicion(formatFechaInputDDMMYYYY(value));
    if (fechaAdquisicionError) setFechaAdquisicionError(null);
  }

  function handleFechaAdquisicionBlur() {
    setFechaAdquisicionError(validarFechaDDMMYYYY(fechaAdquisicion));
  }

  useEffect(() => {
    if (!entidadEfectiva || !catalogo?.codigo || !asignaCodigoInmediato) {
      setCodigoBarrasPreview(null);
      return;
    }
    void previewCodigoBarras(entidadEfectiva, catalogo.codigo).then(setCodigoBarrasPreview);
  }, [entidadEfectiva, catalogo?.codigo, asignaCodigoInmediato]);

  useEffect(() => {
    if (fixedSedeId && !soloUbicacionEdit) {
      setSedeId(fixedSedeId);
      return;
    }
    if (!entidadEfectiva) {
      setSedes([]);
      if (!soloUbicacionEdit) setSedeId("");
      return;
    }
    void listSedes(entidadEfectiva).then((data) => {
      setSedes(data);
      if (data.length === 1 && !soloUbicacionEdit) setSedeId(data[0].id);
    });
  }, [entidadEfectiva, fixedSedeId, soloUbicacionEdit]);

  useEffect(() => {
    if (fixedAmbienteId && !soloUbicacionEdit) setAmbienteId(fixedAmbienteId);
  }, [fixedAmbienteId, soloUbicacionEdit]);

  useEffect(() => {
    if (!sedeId) {
      setAmbientes([]);
      if (!soloUbicacionEdit) setAmbienteId("");
      return;
    }
    void listAmbientes(sedeId).then((data) => {
      setAmbientes(data);
      if (soloUbicacionEdit && ambienteId && !data.some((a) => a.id === ambienteId)) {
        setAmbienteId("");
      }
    });
  }, [sedeId, soloUbicacionEdit, ambienteId]);

  const fechaAdquisicionIso = useMemo(
    () => (fechaAdquisicion.trim() ? parseFechaDDMMYYYY(fechaAdquisicion) : null),
    [fechaAdquisicion],
  );
  const periodoMeses = useMemo(
    () => calcPeriodoMeses(fechaAdquisicionIso),
    [fechaAdquisicionIso],
  );
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
    () => buildNombreConsolidado(nombre, marca, modelo, serie, color, medidas),
    [nombre, marca, modelo, serie, color, medidas],
  );
  const nombreOficial = nombre.trim() || catalogo?.denominacion || "";
  const nombreEtiquetaSugerido = useMemo(
    () => (nombreOficial ? suggestNombreEtiqueta(nombreOficial) : ""),
    [nombreOficial],
  );
  const nombreEnEtiqueta = useMemo(
    () => resolveNombreEtiqueta(nombreOficial, nombreEtiqueta),
    [nombreOficial, nombreEtiqueta],
  );

  function resetFormulario() {
    setCatalogo(null);
    setNombre("");
    setNombreEtiqueta("");
    setDescripcion("");
    setCategoria("ACTIVO");
    setEstadoBien("BUENO");
    setMarca("");
    setModelo("");
    setSerie("");
    setColor("");
    setMedidas("");
    setDepreciacion("");
    setVidaUtilMeses("");
    setValor("");
    setValorEsMercado(false);
    setFechaAdquisicion("");
    setFechaAdquisicionError(null);
    setObservacion("");
    setAmbienteId("");
    setComprobanteFile(null);
    setComprobanteSerie("");
    setFotoFile(null);
    setCodigoBarrasPreview(null);
  }

  function handleComprobanteFileSelect(file: File | null) {
    if (!file) {
      setComprobanteFile(null);
      return;
    }
    setPendingComprobanteFile(file);
    setSerieDialogOpen(true);
  }

  function confirmComprobanteSerie(serie: string) {
    setComprobanteSerie(serie);
    if (pendingComprobanteFile) {
      setComprobanteFile(pendingComprobanteFile);
    }
    setPendingComprobanteFile(null);
    setSerieDialogOpen(false);
  }

  function cancelComprobanteSerie() {
    setPendingComprobanteFile(null);
    setSerieDialogOpen(false);
  }

  function handleValorEsMercadoChange(checked: boolean) {
    setValorEsMercado(checked);
    if (checked) {
      setComprobanteSerie("");
      setComprobanteFile(null);
      setPendingComprobanteFile(null);
      setSerieDialogOpen(false);
    }
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
    const result = await createAmbiente({
      sedeId,
      nombre: nuevoAmbiente,
    });
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
    const form = event.currentTarget;
    setMessage(null);

    if (soloUbicacionEdit && activo) {
      setPending(true);
      if (!sedeId || !ambienteId) {
        setPending(false);
        setMessage("Seleccione sede y ambiente.");
        return;
      }

      const result = await cambiarUbicacionActivo(activo.id, sedeId, ambienteId);

      setPending(false);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setMessage("Ubicación actualizada correctamente.");
      onSuccess?.();
      return;
    }

    if (!catalogo) {
      setMessage("Seleccione un ítem del catálogo nacional.");
      return;
    }

    if (!entidadEfectiva) {
      setMessage("Seleccione la entidad.");
      return;
    }

    const fechaError = validarFechaDDMMYYYY(fechaAdquisicion);
    if (fechaError) {
      setFechaAdquisicionError(fechaError);
      setMessage(fechaError);
      return;
    }

    const labelWarnings = assessLabelPrintWarnings({
      nombreBien: nombreEnEtiqueta,
      entidadNombre: entidadEnEtiqueta,
    });
    if (labelWarnings.length > 0) {
      setLabelWarnText(formatLabelPrintWarnings(labelWarnings));
      setLabelWarnOpen(true);
      return;
    }

    await performSave(form);
  }

  async function performSave(form: HTMLFormElement) {
    if (!catalogo || !entidadEfectiva) return;

    setPending(true);
    setMessage(null);

    const fechaError = validarFechaDDMMYYYY(fechaAdquisicion);
    if (fechaError) {
      setFechaAdquisicionError(fechaError);
      setPending(false);
      setMessage(fechaError);
      return;
    }

    const payload: UpdateActivoInput = {
      codigo_catalogo: catalogo.codigo,
      nombre: nombre.trim() || catalogo.denominacion,
      nombre_etiqueta: nombreEtiqueta.trim() || null,
      descripcion: descripcion || undefined,
      categoria,
      estado_bien: estadoBien,
      marca: marca || undefined,
      modelo: modelo || undefined,
      serie: serie || undefined,
      color: color || undefined,
      medidas: medidas || undefined,
      observacion: observacion || undefined,
      valor_adquisicion: valor ? Number(valor) : undefined,
      valor_es_mercado: valorEsMercado,
      fecha_adquisicion: fechaAdquisicionIso || undefined,
      sede_id: (fixedSedeId ?? sedeId) || undefined,
      ambiente_id: (fixedAmbienteId ?? ambienteId) || undefined,
    };

    if (!valorEsMercado) {
      Object.assign(payload, {
        comprobante_serie: comprobanteSerie.trim() || undefined,
      });
    }
    if (!esPreregistroAdmin) {
      Object.assign(payload, {
        depreciacion: depreciacion || undefined,
        vida_util_meses: vidaUtilMeses ? Number(vidaUtilMeses) : undefined,
      });
    }

    const result = isEdit && activo
      ? await updateActivo(activo.id, payload)
      : await createActivo({
          entidad_id: entidadEfectiva,
          ...payload,
        });

    if (result.error) {
      setPending(false);
      setMessage(result.error);
      return;
    }

    const activoId = isEdit && activo ? activo.id : result.data?.id;
    if (activoId && entidadEfectiva) {
      if (valorEsMercado) {
        if (activo?.comprobante_path || activo?.comprobante_serie) {
          await updateActivoPaths(activoId, {
            comprobante_path: null,
            comprobante_serie: null,
          });
        }
      } else if (comprobanteFile) {
        const upload = await uploadActivoFile(entidadEfectiva, activoId, comprobanteFile, "comprobante");
        if (upload.path) {
          await updateActivoPaths(activoId, {
            comprobante_path: upload.path,
            comprobante_serie: comprobanteSerie.trim() || null,
          });
        }
      } else if (comprobanteSerie.trim()) {
        await updateActivoPaths(activoId, { comprobante_serie: comprobanteSerie.trim() });
      }

      if (fotoFile) {
        const uploadFoto = await uploadActivoFile(entidadEfectiva, activoId, fotoFile, "foto");
        if (uploadFoto.path) {
          await updateActivoPaths(activoId, { foto_path: uploadFoto.path });
        }
      }
    }

    setPending(false);
    if (isEdit) {
      setMessage("Activo actualizado correctamente.");
    } else {
      setMessage(
        result.data?.estado_registro === "REGISTRADO"
          ? `Activo registrado. Código: ${result.data.codigo_barras ?? codigoBarrasPreview ?? "—"}`
          : "Activo preregistrado. Pendiente de validación del contador.",
      );
      resetFormulario();
      form.reset();
    }
    onSuccess?.();
  }

  const hideUbicacion = !soloUbicacionEdit && Boolean(fixedAmbienteId && fixedSedeId);
  const formGridClass =
    variant === "modal"
      ? soloUbicacionEdit
        ? "grid grid-cols-1 gap-4"
        : "grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-2"
      : "space-y-6";
  const fieldsetCompact = variant === "modal" ? `${panelFieldsetClass} lg:col-span-1` : panelFieldsetClass;
  const fieldsetWide = variant === "modal" ? `${panelFieldsetClass} col-span-1 lg:col-span-2` : panelFieldsetClass;
  const categoriaGridClass = variant === "modal" ? "grid gap-3 sm:grid-cols-2" : "space-y-3";
  const detalleGridClass =
    variant === "modal"
      ? "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4"
      : "grid gap-4 sm:grid-cols-2 lg:grid-cols-4";
  const textareaModalClass =
    variant === "modal" ? `${textareaClass} min-h-[100px] sm:min-h-[120px] lg:min-h-[160px] lg:flex-1` : textareaClass;
  const fieldsetNotasClass =
    variant === "modal" ? `${fieldsetCompact} lg:flex lg:flex-col` : fieldsetWide;

  return (
    <>
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className={
        variant === "modal"
          ? `${formGridClass} relative max-h-[85vh] overflow-y-auto pr-0.5 sm:max-h-[78vh] sm:pr-1`
          : "relative space-y-6 overflow-visible rounded-xl border border-border/70 bg-card p-6 shadow-sm"
      }
    >
      {variant === "page" && (
        <p className="text-sm font-medium">
          {soloUbicacionEdit ? "Editar ubicación" : isEdit ? "Editar activo" : "Nuevo activo"}
        </p>
      )}

      {soloUbicacionEdit && activo && (
        <div className="col-span-1 space-y-1 rounded-lg border border-border/50 bg-muted/20 p-4 lg:col-span-2">
          <p className="font-semibold text-foreground">{activo.nombre}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {activo.codigo_barras ?? activo.codigo_catalogo}
          </p>
          <p className="text-xs text-muted-foreground">
            Seleccione la sede y el ambiente de destino. El bien se moverá dentro de su entidad.
          </p>
        </div>
      )}

      {!soloUbicacionEdit && (
      <>
      {/* Identificación */}
      <fieldset className={fieldsetCompact}>
        <legend className={panelLegendClass}>Identificación</legend>

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
          searchCatalogo={searchCatalogo}
          resolveCodigo={getCatalogoByCodigo}
          selectedCodigo={catalogo?.codigo}
          selectedDenominacion={catalogo?.denominacion}
          disabled={pending}
          onSelect={setCatalogo}
          onClear={() => {
            setCatalogo(null);
            setNombre("");
            setNombreEtiqueta("");
            setDepreciacion("");
            setVidaUtilMeses("");
          }}
          renderAddMissing={(q) => (
            <Link
              href={`/contador/catalogo?q=${encodeURIComponent(q)}`}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Agregar «{q}» al catálogo
            </Link>
          )}
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

        <CategoriaBienSelector
          value={categoria}
          onChange={setCategoria}
          ayuda={CATEGORIA_BIEN_AYUDA}
          opciones={(["ACTIVO", "CUENTA_ORDEN"] as const).map((key) => ({
            key,
            ...CATEGORIA_BIEN_LABELS[key],
          }))}
          className={categoriaGridClass}
          headerClassName={variant === "modal" ? "sm:col-span-2" : ""}
        />

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
          <div className="flex flex-wrap items-end justify-between gap-2">
            <Label htmlFor="nombre_etiqueta">Nombre en etiqueta</Label>
            {nombreEtiquetaSugerido && nombreEtiquetaSugerido !== nombreOficial.toUpperCase() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNombreEtiqueta(nombreEtiquetaSugerido)}
              >
                Usar sugerencia
              </Button>
            )}
          </div>
          <Input
            id="nombre_etiqueta"
            value={nombreEtiqueta}
            onChange={(e) => setNombreEtiqueta(e.target.value)}
            placeholder={
              nombreEtiquetaSugerido && nombreEtiquetaSugerido !== nombreOficial.toUpperCase()
                ? nombreEtiquetaSugerido
                : "Si está vacío, se usa el nombre del bien"
            }
          />
          <p className="text-xs text-muted-foreground">
            Opcional. Texto que se imprime en la etiqueta 50×25 mm. Si está vacío, se usa el nombre
            del bien.
          </p>
        </div>

        {(nombreEnEtiqueta || entidadEnEtiqueta) && (
          <LabelPrintTextPreview
            nombreBien={nombreEnEtiqueta}
            entidadNombre={entidadEnEtiqueta}
          />
        )}
      </fieldset>

      {/* Detalle físico */}
      <fieldset className={fieldsetCompact}>
        <legend className={panelLegendClass}>Detalle del bien</legend>
        <div className={detalleGridClass}>
          <ActivoAtributoAutocomplete
            id="marca"
            label="Marca"
            campo="marca"
            value={marca}
            onChange={setMarca}
            onSearch={searchAtributo}
          />
          <ActivoAtributoAutocomplete
            id="modelo"
            label="Modelo"
            campo="modelo"
            value={modelo}
            onChange={setModelo}
            onSearch={searchAtributo}
          />
          <ActivoAtributoAutocomplete
            id="serie"
            label="Serie"
            campo="serie"
            value={serie}
            onChange={setSerie}
            onSearch={searchAtributo}
          />
          <ActivoAtributoAutocomplete
            id="color"
            label="Color"
            campo="color"
            value={color}
            onChange={setColor}
            onSearch={searchAtributo}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="medidas">Medidas</Label>
          <Input
            id="medidas"
            value={medidas}
            onChange={(e) => setMedidas(e.target.value)}
            placeholder='Ej. 65", 120 cm, 2.5 m, 20 L'
          />
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
        <div className="space-y-2 border-t border-border/50 pt-4">
          <Label>Nombre consolidado</Label>
          <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            {nombreConsolidado || "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            Se forma con: nombre, marca, modelo, serie, color y medidas.
          </p>
        </div>
      </fieldset>

      {/* Valoración */}
      <fieldset className={fieldsetCompact}>
        <legend className={panelLegendClass}>
          {esPreregistroAdmin ? "Valoración (opcional)" : "Valoración y depreciación"}
        </legend>
        {esPreregistroAdmin && (
          <p className="text-sm text-muted-foreground">
            La depreciación y vida útil las completará el contador al validar el preregistro.
          </p>
        )}
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
                onChange={(e) => handleValorEsMercadoChange(e.target.checked)}
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
              inputMode="numeric"
              value={fechaAdquisicion}
              onChange={(e) => handleFechaAdquisicionChange(e.target.value)}
              onBlur={handleFechaAdquisicionBlur}
              placeholder="DD/MM/AAAA"
              maxLength={10}
              aria-invalid={Boolean(fechaAdquisicionError)}
            />
            {fechaAdquisicionError && (
              <p className="text-xs text-destructive">{fechaAdquisicionError}</p>
            )}
          </div>
        </div>
        {!valorEsMercado && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="comprobante_serie">Serie del comprobante</Label>
              <Input
                id="comprobante_serie"
                value={comprobanteSerie}
                onChange={(e) => setComprobanteSerie(e.target.value)}
                placeholder="Ej. F/E001-129 (puede ir sin PDF)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comprobante">PDF del comprobante</Label>
              <Input
                id="comprobante"
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                onChange={(e) => handleComprobanteFileSelect(e.target.files?.[0] ?? null)}
              />
              {comprobanteFile && (
                <p className="text-xs text-primary">Archivo listo: {comprobanteFile.name}</p>
              )}
              {isEdit && activo?.comprobante_path && !comprobanteFile && (
                <p className="text-xs text-muted-foreground">Ya hay un PDF adjunto</p>
              )}
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="foto_activo">Foto del activo</Label>
          <Input
            id="foto_activo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFotoFile(e.target.files?.[0] ?? null)}
          />
          {fotoFile && <p className="text-xs text-primary">Foto lista: {fotoFile.name}</p>}
          {isEdit && activo?.foto_path && !fotoFile && (
            <p className="text-xs text-muted-foreground">Ya hay una foto adjunta</p>
          )}
        </div>
        {!esPreregistroAdmin && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="depreciacion">Depreciación anual (%)</Label>
                <Input
                  id="depreciacion"
                  value={depreciacion}
                  onChange={(e) => handleDepreciacionChange(e.target.value)}
                  placeholder="Ej. 10 %"
                />
                <p className="text-xs text-muted-foreground">
                  Al ingresar el % se calcula la vida útil en meses
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vida_util_meses">Vida útil (meses)</Label>
                <Input
                  id="vida_util_meses"
                  type="number"
                  min="1"
                  value={vidaUtilMeses}
                  onChange={(e) => handleVidaUtilChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Al ingresar meses se calcula el % anual equivalente
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 rounded-md bg-muted/50 p-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Periodo (meses)</p>
                <p className="font-medium">{fechaAdquisicionIso ? periodoMeses : "—"}</p>
                <p className="mt-1 text-xs text-muted-foreground">Meses desde la fecha de adquisición</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Depreciación acumulada</p>
                <p className="font-medium">{formatSoles(depreciacionAcumulada)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  (Valor ÷ vida útil) × periodo, sin superar el valor
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor neto</p>
                <p className="font-medium">{formatSoles(valorNeto)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Valor menos depreciación acumulada</p>
              </div>
            </div>
          </>
        )}
      </fieldset>

      {/* Descripción y observación — columna derecha en modal */}
      <fieldset className={fieldsetNotasClass}>
        <legend className={panelLegendClass}>Descripción y observación (opcional)</legend>
        <div className={variant === "modal" ? "flex flex-col gap-4 lg:flex-1 lg:flex-col" : "grid gap-4 lg:grid-cols-2"}>
          <div className={variant === "modal" ? "space-y-2 lg:flex lg:flex-1 lg:flex-col" : "space-y-2"}>
            <Label htmlFor="descripcion">Descripción</Label>
            <textarea
              id="descripcion"
              className={textareaModalClass}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Uso, ubicación física, detalle general…"
            />
          </div>
          <div className={variant === "modal" ? "space-y-2 lg:flex lg:flex-1 lg:flex-col" : "space-y-2"}>
            <Label htmlFor="observacion">Observación</Label>
            <textarea
              id="observacion"
              className={textareaModalClass}
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Notas adicionales, incidencias, condiciones especiales…"
            />
          </div>
        </div>
      </fieldset>
      </>
      )}

      {/* Ubicación */}
      {!hideUbicacion && (
      <fieldset className={fieldsetWide}>
        <legend className={panelLegendClass}>Ubicación</legend>
        {!soloUbicacionEdit && sedes.length === 0 ? (
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
              required={soloUbicacionEdit}
              className={selectClass}
              value={sedeId}
              onChange={(e) => {
                const nextSede = e.target.value;
                setSedeId(nextSede);
                if (soloUbicacionEdit) setAmbienteId("");
              }}
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
              required={soloUbicacionEdit}
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
            {!soloUbicacionEdit && (
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
            )}
          </div>
        )}
      </fieldset>
      )}

      {message && (
        <p
          className={`text-sm col-span-1 lg:col-span-2 ${message.includes("Error") || message.includes("obligator") || message.includes("Seleccione") ? "text-destructive" : "text-primary"}`}
        >
          {message}
        </p>
      )}

      <div className={variant === "modal" ? "col-span-1 lg:col-span-2" : undefined}>
        <Button type="submit" disabled={pending || (!catalogo && !soloUbicacionEdit)}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
      </div>
    </form>

    <ComprobanteSerieDialog
      open={serieDialogOpen}
      fileName={pendingComprobanteFile?.name}
      initialSerie={comprobanteSerie}
      onConfirm={confirmComprobanteSerie}
      onCancel={cancelComprobanteSerie}
    />

    <ConfirmDialog
      open={labelWarnOpen}
      onClose={() => setLabelWarnOpen(false)}
      title="Texto largo para la etiqueta"
      description="El contenido podría verse reducido o truncado al imprimir la etiqueta 50×25 mm."
      confirmLabel="Guardar de todos modos"
      cancelLabel="Volver a editar"
      pending={pending}
      onConfirm={() => {
        setLabelWarnOpen(false);
        if (formRef.current) void performSave(formRef.current);
      }}
    >
      <p className="whitespace-pre-line text-sm text-muted-foreground">{labelWarnText}</p>
    </ConfirmDialog>
    </>
  );
}
