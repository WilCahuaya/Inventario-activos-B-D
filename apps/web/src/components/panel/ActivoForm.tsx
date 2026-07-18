"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Activo, Ambiente, CatalogoNacional, CategoriaBien, Entidad, Sede } from "@inventario/types";
import {
  ACTIVO_COMPROBANTE_ACCEPT,
  ACTIVO_FOTO_ACCEPT,
  CATEGORIA_BIEN_AYUDA,
  CATEGORIA_BIEN_LABELS,
  CATALOGO_CUENTA_ORDEN_CONTABILIDAD,
  activoTieneCuentaContablePropia,
  applyCuentaContableToPayloadIfProvided,
  assessLabelPrintWarnings,
  buildNombreConsolidado,
  calcDepreciacionAcumulada,
  calcPeriodoMeses,
  calcValorNeto,
  formatComprobanteSerieInput,
  formatFechaInputDDMMYYYY,
  formatFechaISOToDDMMYYYY,
  formatLabelPrintWarnings,
  formatPorcentajeDepreciacion,
  nombreRequiereEtiquetaOverride,
  parseFechaDDMMYYYY,
  parsePorcentajeDepreciacion,
  porcentajeFromVidaUtilMeses,
  resolveNombreEtiqueta,
  suggestNombreEtiqueta,
  validarFechaDDMMYYYY,
  validarCuentaContableParaCatalogo,
  vidaUtilMesesFromPorcentaje,
  debePersistirCuentaContableEnActivo,
  entidadMuestraSelectorSede,
  sedeIdSinSelector,
  splitObservacionActivo,
  type ActivoAtributoCampo,
  type UpdateActivosSimilaresInput,
} from "@inventario/types";
import {
  ActivoAtributoAutocomplete,
  Button,
  CatalogoAltaPanel,
  CatalogoPicker,
  CategoriaBienSelector,
  ConfirmDialog,
  CuentaContableFields,
  Dialog,
  FileInput,
  Input,
  Label,
  LabelPrintTextPreview,
  parseCatalogoNacionalAltaPrefill,
  PorcentajeInput,
  Select,
  Textarea,
} from "@inventario/ui";
import {
  createActivo,
  previewCodigoBarras,
  updateActivo,
  updateActivoPaths,
  updateActivosSimilares,
  type UpdateActivoInput,
} from "@/lib/actions/activos";
import { suggestActivoAtributo } from "@/lib/actions/atributo-vocab";
import {
  createCatalogoNacional,
  createCatalogoNacionalExtension,
  deleteCatalogoOpcionPersonalizada,
  getCatalogoByCodigo,
  getNextCodigoCatalogoPropio,
  listCatalogoClases,
  listCatalogoGrupos,
  registerCatalogoOpcionPersonalizada,
  searchCatalogo,
  searchCuentasContables,
  suggestCatalogoGrupo,
  upsertCuentaContable,
} from "@/lib/actions/catalogo";
import { createAmbiente, createSede, listAmbientes, listAmbientesPorEntidad, listSedes } from "@/lib/actions/ubicacion";
import { uploadActivoFile } from "@/lib/upload-activo-file";
import { FotoPreviewDialog, PdfPreviewDialog } from "./ActivoMediaDialogs";
import { ComprobanteSerieDialog } from "./ComprobanteSerieDialog";
import type { ActivoEditScope } from "@inventario/ui/panel";
import { panelFieldsetClass, panelLegendClass, panelModalClass } from "./panel-ui";

type CatalogoAltaInline = {
  variant: "nacional" | "propio";
  query: string;
};

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
  /** Admin: posible ambiente sugerido al preregistrar desde un ambiente real */
  posibleAmbientePreset?: { sedeId: string; ambienteId: string };
  /** Admin entidad: en edición solo puede cambiar sede/ambiente */
  soloUbicacion?: boolean;
  /**
   * Admin en edición masiva de preregistrados: solo posible ambiente
   * (alineado con update_activos_similares).
   */
  soloPosibleAmbiente?: boolean;
  /** Alcance de edición cuando hay ejemplares similares */
  editScope?: ActivoEditScope;
  ejemplaresTotal?: number;
  variant?: "page" | "modal";
  onSuccess?: () => void;
  onCancel?: () => void;
  /** Código de catálogo nacional a precargar al crear (8 dígitos). */
  initialCatalogoCodigo?: string;
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
  posibleAmbientePreset,
  soloUbicacion = false,
  soloPosibleAmbiente = false,
  editScope = "single",
  ejemplaresTotal = 0,
  variant = "page",
  onSuccess,
  onCancel,
  initialCatalogoCodigo,
}: ActivoFormProps) {
  const isEdit = mode === "edit" && Boolean(activo);
  const esEdicionMasiva = Boolean(
    isEdit && ejemplaresTotal > 1 && editScope === "bulk",
  );
  const formRef = useRef<HTMLFormElement>(null);
  const soloUbicacionEdit = isEdit && soloUbicacion;
  /** Alta preregistro admin */
  const esPreregistro = !asignaCodigoInmediato && !isEdit;
  /** Preregistro admin (crear o editar PREREGISTRADO): sin depreciación ni vida útil */
  const esPreregistroAdmin =
    !asignaCodigoInmediato && (!isEdit || activo?.estado_registro === "PREREGISTRADO");
  /** Admin en lote preregistrado: solo posible ambiente. */
  const esEdicionMasivaAdminPreregistro = Boolean(
    esEdicionMasiva && soloPosibleAmbiente,
  );
  const mostrarPosibleAmbiente =
    (!isEdit && !asignaCodigoInmediato) ||
    (isEdit && activo?.estado_registro === "PREREGISTRADO");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [catalogo, setCatalogo] = useState<CatalogoNacional | null>(null);
  const [nombre, setNombre] = useState("");
  const [nombreEtiqueta, setNombreEtiqueta] = useState("");
  const [categoria, setCategoria] = useState<CategoriaBien>("ACTIVO");
  const mostrarDepreciacion = categoria !== "CUENTA_ORDEN" && !esPreregistroAdmin;
  const mostrarCuentaContable =
    asignaCodigoInmediato && !soloUbicacionEdit && !esEdicionMasiva;
  const [estadoBien, setEstadoBien] = useState<"BUENO" | "REGULAR" | "MALO">("BUENO");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [serie, setSerie] = useState("");
  const [color, setColor] = useState("");
  const [medidas, setMedidas] = useState("");
  const [detalle, setDetalle] = useState("");
  const [depreciacion, setDepreciacion] = useState("");
  const [vidaUtilMeses, setVidaUtilMeses] = useState("");
  const [valor, setValor] = useState("");
  const [valorEsMercado, setValorEsMercado] = useState(false);
  const [fechaAdquisicion, setFechaAdquisicion] = useState("");
  const [fechaAdquisicionError, setFechaAdquisicionError] = useState<string | null>(null);
  const [observacion, setObservacion] = useState("");
  const [observacionAdmin, setObservacionAdmin] = useState("");
  const [entidadId, setEntidadId] = useState(fixedEntidadId ?? "");
  const [codigoBarrasPreview, setCodigoBarrasPreview] = useState<string | null>(null);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [sedeId, setSedeId] = useState("");
  const [ambienteId, setAmbienteId] = useState("");
  const [posibleSedeId, setPosibleSedeId] = useState(() => {
    const a = activo as (Activo & { posible_sede_id?: string | null }) | undefined;
    return a?.posible_sede_id ?? "";
  });
  const [posibleAmbienteId, setPosibleAmbienteId] = useState(
    () => activo?.posible_ambiente_id ?? "",
  );
  const [posibleAmbientes, setPosibleAmbientes] = useState<
    Array<Ambiente & { sede_nombre?: string }>
  >([]);
  const [nuevaSede, setNuevaSede] = useState("");
  const [nuevoAmbiente, setNuevoAmbiente] = useState("");
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [comprobanteSerie, setComprobanteSerie] = useState("");
  const [cuentaCodigo, setCuentaCodigo] = useState("");
  const [cuentaNombre, setCuentaNombre] = useState("");
  const cuentaReferenciaRef = useRef({ codigo: "", nombre: "" });
  const [serieDialogOpen, setSerieDialogOpen] = useState(false);
  const [catalogoAlta, setCatalogoAlta] = useState<CatalogoAltaInline | null>(null);

  const searchAtributo = useCallback(
    (campo: ActivoAtributoCampo, query: string) => suggestActivoAtributo(campo, query),
    [],
  );
  const [pendingComprobanteFile, setPendingComprobanteFile] = useState<File | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreviewOpen, setFotoPreviewOpen] = useState(false);
  const [comprobantePreviewOpen, setComprobantePreviewOpen] = useState(false);
  const [labelWarnOpen, setLabelWarnOpen] = useState(false);
  const [labelWarnText, setLabelWarnText] = useState("");

  const entidadEfectiva = fixedEntidadId || entidadId || activo?.entidad_id || "";
  const entidadSeleccionada = useMemo(
    () => entidades.find((e) => e.id === entidadEfectiva),
    [entidades, entidadEfectiva],
  );
  const entidadNombre = entidadSeleccionada?.nombre ?? "";
  const entidadEnEtiqueta = useMemo(
    () => resolveNombreEtiqueta(entidadNombre, entidadSeleccionada?.nombre_etiqueta),
    [entidadNombre, entidadSeleccionada?.nombre_etiqueta],
  );
  const observacionPartes = useMemo(
    () => splitObservacionActivo(activo?.observacion),
    [activo?.observacion],
  );

  useEffect(() => {
    if (!initialCatalogoCodigo || isEdit) return;
    void getCatalogoByCodigo(initialCatalogoCodigo).then((item) => {
      if (item) setCatalogo(item);
    });
  }, [initialCatalogoCodigo, isEdit]);

  useEffect(() => {
    if (!activo || !isEdit) return;

    void getCatalogoByCodigo(activo.codigo_catalogo).then((item) => {
      if (item) setCatalogo(item);
    });

    setNombre(activo.nombre);
    setNombreEtiqueta(activo.nombre_etiqueta ?? "");
    setCategoria(activo.categoria);
    setEstadoBien(activo.estado_bien);
    setMarca(activo.marca ?? "");
    setModelo(activo.modelo ?? "");
    setSerie(activo.serie ?? "");
    setColor(activo.color ?? "");
    setMedidas(activo.medidas ?? "");
    setDetalle(activo.caracteristicas ?? "");
    setDepreciacion(activo.depreciacion ?? "");
    setVidaUtilMeses(activo.vida_util_meses != null ? String(activo.vida_util_meses) : "");
    setValor(activo.valor_adquisicion != null ? String(activo.valor_adquisicion) : "");
    setValorEsMercado(activo.valor_es_mercado);
    setFechaAdquisicion(formatFechaISOToDDMMYYYY(activo.fecha_adquisicion));
    setObservacion(activo.observacion ?? "");
    setObservacionAdmin(splitObservacionActivo(activo.observacion).admin);
    setComprobanteSerie(
      activo.comprobante_serie ? formatComprobanteSerieInput(activo.comprobante_serie) : "",
    );
    if (activoTieneCuentaContablePropia(activo)) {
      const codigo = activo.cuenta_contable_codigo ?? "";
      const nombre = activo.cuenta_contable_nombre ?? "";
      setCuentaCodigo(codigo);
      setCuentaNombre(nombre);
      cuentaReferenciaRef.current = { codigo, nombre };
    }
    setCodigoBarrasPreview(activo.codigo_barras);
    if (activo.sede_id) setSedeId(activo.sede_id);
    if (activo.ambiente_id) setAmbienteId(activo.ambiente_id);
    setPosibleAmbienteId(activo.posible_ambiente_id ?? "");
    const posibleSede =
      (activo as Activo & { posible_sede_id?: string | null }).posible_sede_id ?? "";
    setPosibleSedeId(posibleSede);
  }, [activo, isEdit]);

  useEffect(() => {
    if (!mostrarPosibleAmbiente || !posibleAmbienteId || posibleSedeId) return;
    const match = posibleAmbientes.find((a) => a.id === posibleAmbienteId);
    if (match?.sede_id) setPosibleSedeId(match.sede_id);
  }, [mostrarPosibleAmbiente, posibleAmbienteId, posibleAmbientes, posibleSedeId]);

  useEffect(() => {
    if (isEdit || !posibleAmbientePreset) return;
    setPosibleSedeId(posibleAmbientePreset.sedeId);
    setPosibleAmbienteId(posibleAmbientePreset.ambienteId);
  }, [isEdit, posibleAmbientePreset]);

  useEffect(() => {
    if (catalogo) {
      setNombre(catalogo.denominacion);
      if (mostrarDepreciacion && catalogo.depreciacion) {
        setDepreciacion(catalogo.depreciacion);
        const pct = parsePorcentajeDepreciacion(catalogo.depreciacion);
        if (pct) setVidaUtilMeses(String(vidaUtilMesesFromPorcentaje(pct)));
      }
    }
  }, [catalogo?.codigo, mostrarDepreciacion]);

  useEffect(() => {
    if (!catalogo || isEdit) return;
    if (categoria === "CUENTA_ORDEN") {
      setCuentaCodigo(CATALOGO_CUENTA_ORDEN_CONTABILIDAD);
      setCuentaNombre("");
      cuentaReferenciaRef.current = {
        codigo: CATALOGO_CUENTA_ORDEN_CONTABILIDAD,
        nombre: "",
      };
      return;
    }
    const codigo = catalogo.cuenta_codigo ?? "";
    const nombre = catalogo.contabilidad ?? "";
    setCuentaCodigo(codigo);
    setCuentaNombre(nombre);
    cuentaReferenciaRef.current = { codigo, nombre };
  }, [catalogo?.codigo, isEdit, categoria]);

  useEffect(() => {
    if (!isEdit || !activo || !catalogo || activoTieneCuentaContablePropia(activo)) return;
    if (categoria === "CUENTA_ORDEN") {
      setCuentaCodigo(CATALOGO_CUENTA_ORDEN_CONTABILIDAD);
      setCuentaNombre("");
      cuentaReferenciaRef.current = {
        codigo: CATALOGO_CUENTA_ORDEN_CONTABILIDAD,
        nombre: "",
      };
      return;
    }
    const codigo = catalogo.cuenta_codigo ?? "";
    const nombre = catalogo.contabilidad ?? "";
    setCuentaCodigo(codigo);
    setCuentaNombre(nombre);
    cuentaReferenciaRef.current = { codigo, nombre };
  }, [isEdit, activo, catalogo?.codigo, categoria]);

  useEffect(() => {
    if (categoria === "CUENTA_ORDEN") {
      setDepreciacion("");
      setVidaUtilMeses("");
      if (mostrarCuentaContable) {
        setCuentaCodigo(CATALOGO_CUENTA_ORDEN_CONTABILIDAD);
        setCuentaNombre("");
      }
    }
  }, [categoria, mostrarCuentaContable]);

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

  const mostrarSelectorSede = entidadMuestraSelectorSede(sedes);

  useEffect(() => {
    if (fixedSedeId && !soloUbicacionEdit) {
      setSedeId(fixedSedeId);
    }
    if (!entidadEfectiva) {
      setSedes([]);
      if (!soloUbicacionEdit && !fixedSedeId) setSedeId("");
      return;
    }
    let cancelled = false;
    void listSedes(entidadEfectiva)
      .then((data) => {
        if (cancelled) return;
        setSedes(data);
        if (!soloUbicacionEdit && !fixedSedeId) {
          setSedeId(sedeIdSinSelector(data) ?? "");
        }
        // Solo en alta: precargar la única sede. En edición respetar posible_sede_id.
        if (!isEdit) {
          const implicitId = sedeIdSinSelector(data);
          if (implicitId) setPosibleSedeId((prev) => prev || implicitId);
        }
      })
      .catch(() => {
        if (!cancelled) setSedes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [entidadEfectiva, fixedSedeId, soloUbicacionEdit, isEdit]);

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

  useEffect(() => {
    const entidadPosible = entidadEfectiva || activo?.entidad_id || "";
    if (!mostrarPosibleAmbiente || !entidadPosible) {
      setPosibleAmbientes([]);
      return;
    }
    void listAmbientesPorEntidad(entidadPosible).then((data) => {
      const reales = data.filter((a) => !a.es_preregistro);
      setPosibleAmbientes(reales);
    });
  }, [mostrarPosibleAmbiente, entidadEfectiva, activo?.entidad_id]);

  const posibleAmbientesOpciones = useMemo(() => {
    const sedeFiltroValida =
      Boolean(posibleSedeId) && sedes.some((s) => s.id === posibleSedeId);
    const filtrados = sedeFiltroValida
      ? posibleAmbientes.filter((a) => a.sede_id === posibleSedeId)
      : posibleAmbientes;
    // Si el valor actual quedó fuera del filtro (p. ej. al editar), inclúyelo igual.
    const seleccion = posibleAmbienteId
      ? posibleAmbientes.find((a) => a.id === posibleAmbienteId)
      : undefined;
    let lista =
      seleccion && !filtrados.some((a) => a.id === seleccion.id)
        ? [seleccion, ...filtrados]
        : filtrados;
    if (
      posibleAmbienteId &&
      !lista.some((a) => a.id === posibleAmbienteId) &&
      (activo as Activo & { posible_ambiente_nombre?: string })?.posible_ambiente_nombre
    ) {
      lista = [
        {
          id: posibleAmbienteId,
          nombre: (activo as Activo & { posible_ambiente_nombre?: string })
            .posible_ambiente_nombre!,
          sede_id: posibleSedeId,
          sede_nombre: (activo as Activo & { posible_sede_nombre?: string })
            ?.posible_sede_nombre,
        } as Ambiente & { sede_nombre?: string },
        ...lista,
      ];
    }
    const conSedeEnLabel = sedes.length > 1 && !sedeFiltroValida;
    return [
      { value: "", label: "Sin sugerencia…" },
      ...lista.map((a) => ({
        value: a.id,
        label:
          conSedeEnLabel && a.sede_nombre
            ? `${a.nombre} (${a.sede_nombre})`
            : a.nombre,
      })),
    ];
  }, [posibleAmbientes, posibleSedeId, sedes, posibleAmbienteId, activo]);

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
    () => buildNombreConsolidado(nombre, marca, modelo, serie, color, medidas, detalle),
    [nombre, marca, modelo, serie, color, medidas, detalle],
  );
  const nombreOficial = nombre.trim() || catalogo?.denominacion || "";
  const nombreEtiquetaSugerido = useMemo(
    () => (nombreOficial ? suggestNombreEtiqueta(nombreOficial) : ""),
    [nombreOficial],
  );
  const mostrarNombreEtiqueta = useMemo(
    () => nombreRequiereEtiquetaOverride(nombreOficial),
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

  function confirmComprobanteSerie(datos: {
    serie: string;
    fecha: string;
    monto: string;
  }) {
    setComprobanteSerie(formatComprobanteSerieInput(datos.serie));
    if (datos.fecha.trim()) {
      setFechaAdquisicion(formatFechaInputDDMMYYYY(datos.fecha));
      setFechaAdquisicionError(validarFechaDDMMYYYY(datos.fecha));
    }
    if (datos.monto.trim()) {
      setValor(datos.monto.trim());
    }
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

    if (esEdicionMasivaAdminPreregistro && activo) {
      setPending(true);
      const result = await updateActivosSimilares(activo.id, {
        posible_ambiente_id: posibleAmbienteId || null,
      });
      setPending(false);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setMessage(
        `${"data" in result && result.data ? (result.data as { actualizados?: number }).actualizados : ejemplaresTotal} ejemplares actualizados.`,
      );
      onSuccess?.();
      return;
    }

    if (soloUbicacionEdit && activo) {
      setPending(true);
      if (!sedeId || !ambienteId) {
        setPending(false);
        setMessage("Seleccione sede y ambiente.");
        return;
      }

      const result = esEdicionMasiva
        ? await updateActivosSimilares(activo.id, {
            sede_id: sedeId,
            ambiente_id: ambienteId,
          })
        : await updateActivo(activo.id, {
            codigo_catalogo: activo.codigo_catalogo,
            nombre: activo.nombre,
            sede_id: sedeId,
            ambiente_id: ambienteId,
            estado_bien: estadoBien,
            observacion_admin: observacionAdmin,
          });

      setPending(false);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      if (esEdicionMasiva) {
        setMessage(
          `${"data" in result && result.data ? (result.data as { actualizados?: number }).actualizados : ejemplaresTotal} ejemplares actualizados.`,
        );
      } else {
        setMessage("Bien actualizado correctamente.");
      }
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

    if (!esEdicionMasiva) {
      const labelWarnings = assessLabelPrintWarnings({
        nombreBien: nombreEnEtiqueta,
        entidadNombre: entidadEnEtiqueta,
      });
      if (labelWarnings.length > 0) {
        setLabelWarnText(formatLabelPrintWarnings(labelWarnings));
        setLabelWarnOpen(true);
        return;
      }
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

    if (
      mostrarCuentaContable &&
      categoria === "ACTIVO" &&
      (cuentaCodigo.trim() || cuentaNombre.trim())
    ) {
      const cuentaError = validarCuentaContableParaCatalogo(cuentaCodigo, cuentaNombre);
      if (cuentaError) {
        setPending(false);
        setMessage(cuentaError);
        return;
      }
    }

    const payload: UpdateActivoInput = {
      codigo_catalogo: catalogo.codigo,
      nombre: nombre.trim() || catalogo.denominacion,
      nombre_etiqueta: mostrarNombreEtiqueta ? nombreEtiqueta.trim() || null : null,
      categoria,
      estado_bien: estadoBien,
      marca: marca || undefined,
      modelo: modelo || undefined,
      serie: serie || undefined,
      color: color || undefined,
      medidas: medidas || undefined,
      caracteristicas: detalle.trim() || undefined,
      observacion: observacion || undefined,
      valor_adquisicion: valor ? Number(valor) : undefined,
      valor_es_mercado: valorEsMercado,
      fecha_adquisicion: fechaAdquisicionIso || undefined,
    };

    if (mostrarPosibleAmbiente) {
      payload.posible_ambiente_id = posibleAmbienteId || null;
    } else {
      payload.sede_id = (fixedSedeId ?? sedeId) || undefined;
      payload.ambiente_id = (fixedAmbienteId ?? ambienteId) || undefined;
    }

    if (!valorEsMercado) {
      Object.assign(payload, {
        comprobante_serie: comprobanteSerie.trim() || undefined,
      });
    }
    if (mostrarDepreciacion) {
      Object.assign(payload, {
        depreciacion: depreciacion || undefined,
        vida_util_meses: vidaUtilMeses ? Number(vidaUtilMeses) : undefined,
      });
    }
    if (
      mostrarCuentaContable &&
      debePersistirCuentaContableEnActivo({
        esEdicion: Boolean(isEdit && activo),
        activoTienePropia: activo ? activoTieneCuentaContablePropia(activo) : false,
        cuentaCodigo,
        cuentaNombre,
        referenciaCodigo: cuentaReferenciaRef.current.codigo,
        referenciaNombre: cuentaReferenciaRef.current.nombre,
      })
    ) {
      payload.cuenta_contable_codigo = cuentaCodigo.trim() || null;
      payload.cuenta_contable_nombre = cuentaNombre.trim() || null;
    }

    let bulkPatch: UpdateActivosSimilaresInput | null = null;
    if (isEdit && activo && esEdicionMasiva) {
      bulkPatch = {
        categoria: payload.categoria,
        valor_adquisicion: payload.valor_adquisicion ?? null,
        valor_es_mercado: payload.valor_es_mercado,
        fecha_adquisicion: payload.fecha_adquisicion ?? null,
        observacion: observacion.trim() || null,
      };
      if (mostrarDepreciacion) {
        bulkPatch.depreciacion = depreciacion.trim() || null;
      }
      if (valorEsMercado) {
        bulkPatch.comprobante_path = null;
        bulkPatch.comprobante_serie = null;
      } else {
        bulkPatch.comprobante_serie = comprobanteSerie.trim() || null;
        if (comprobanteFile) {
          const upload = await uploadActivoFile(
            entidadEfectiva,
            activo.id,
            comprobanteFile,
            "comprobante",
            activo.comprobante_path,
          );
          if (upload.path) bulkPatch.comprobante_path = upload.path;
        }
      }
      if (fotoFile) {
        const uploadFoto = await uploadActivoFile(
          entidadEfectiva,
          activo.id,
          fotoFile,
          "foto",
          activo.foto_path,
        );
        if (uploadFoto.path) bulkPatch.foto_path = uploadFoto.path;
      }
    }

    const result =
      isEdit && activo
        ? esEdicionMasiva && bulkPatch
          ? await updateActivosSimilares(activo.id, bulkPatch)
          : await updateActivo(activo.id, payload)
        : await createActivo({
          entidad_id: entidadEfectiva,
          ...payload,
          estado_registro: mostrarPosibleAmbiente ? "PREREGISTRADO" : "REGISTRADO",
        });

    if (result.error) {
      setPending(false);
      setMessage(result.error);
      return;
    }

    const activoId = isEdit && activo ? activo.id : result.data?.id;
    if (activoId && entidadEfectiva && !esEdicionMasiva) {
      if (valorEsMercado) {
        if (activo?.comprobante_path || activo?.comprobante_serie) {
          await updateActivoPaths(activoId, {
            comprobante_path: null,
            comprobante_serie: null,
          });
        }
      } else if (comprobanteFile) {
        const upload = await uploadActivoFile(
          entidadEfectiva,
          activoId,
          comprobanteFile,
          "comprobante",
          activo?.comprobante_path,
        );
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
        const uploadFoto = await uploadActivoFile(
          entidadEfectiva,
          activoId,
          fotoFile,
          "foto",
          activo?.foto_path,
        );
        if (uploadFoto.path) {
          await updateActivoPaths(activoId, { foto_path: uploadFoto.path });
        }
      }
    }

    setPending(false);
    if (isEdit) {
      const actualizados =
        esEdicionMasiva && "data" in result && result.data
          ? (result.data as { actualizados?: number }).actualizados
          : undefined;
      setMessage(
        esEdicionMasiva
          ? `${actualizados ?? ejemplaresTotal} ejemplares actualizados correctamente.`
          : "Activo actualizado correctamente.",
      );
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

  const hideUbicacion =
    mostrarPosibleAmbiente || (!soloUbicacionEdit && Boolean(fixedAmbienteId && fixedSedeId));
  const isGridForm = variant === "modal" || variant === "page";
  const formGridClass =
    isGridForm && soloUbicacionEdit
      ? "grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:gap-5"
      : isGridForm
        ? "grid min-w-0 grid-cols-1 gap-4 md:gap-5 lg:grid-cols-2"
        : "space-y-6";
  const colSpanHalf = soloUbicacionEdit ? "md:col-span-1" : "lg:col-span-1";
  const colSpanFull = soloUbicacionEdit ? "md:col-span-2" : "lg:col-span-2";
  const fieldsetCompact = isGridForm
    ? `${panelFieldsetClass} ${colSpanHalf}`
    : panelFieldsetClass;
  const fieldsetWide = isGridForm
    ? `${panelFieldsetClass} col-span-1 ${colSpanFull}`
    : panelFieldsetClass;
  const fieldsetUbicacionAdmin = soloUbicacionEdit ? fieldsetCompact : fieldsetWide;
  const categoriaGridClass = isGridForm ? "grid gap-3 sm:grid-cols-2" : "space-y-3";
  const detalleGridClass = isGridForm
    ? "grid min-w-0 grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4"
    : "grid gap-4 sm:grid-cols-2 lg:grid-cols-4";
  const actionsBottomRight = isGridForm;
  const messageToneClass =
    message &&
    (message.includes("Error") ||
      message.includes("obligator") ||
      message.includes("Seleccione"))
      ? "text-destructive"
      : "text-primary";
  const formActionButtons = (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        type="submit"
        disabled={
          pending || (!catalogo && !soloUbicacionEdit && !esEdicionMasivaAdminPreregistro)
        }
      >
        {pending
          ? "Guardando…"
          : esEdicionMasiva
            ? `Guardar en ${ejemplaresTotal} ejemplares`
            : submitLabel}
      </Button>
      {onCancel && (
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      )}
    </div>
  );
  return (
    <>
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className={
        isGridForm
          ? `${formGridClass} relative min-w-0 w-full max-w-full`
          : "relative space-y-6 overflow-visible rounded-xl border border-border/70 bg-card p-6 shadow-sm"
      }
    >
      {variant === "page" && !onCancel && (
        <p className={`col-span-1 text-sm font-medium ${colSpanFull}`}>
          {soloUbicacionEdit
            ? "Editar bien"
            : isEdit
              ? "Editar activo"
              : "Nuevo activo"}
        </p>
      )}

      {esEdicionMasivaAdminPreregistro && (
        <div className="col-span-1 rounded-lg border border-primary/25 bg-primary/5 p-4 text-sm text-foreground lg:col-span-2">
          Solo puede actualizar el <strong>posible ambiente</strong> de los{" "}
          <strong>{ejemplaresTotal} ejemplares</strong> de este lote. El resto de datos del
          preregistro se edita unidad por unidad o lo gestiona el contador.
        </div>
      )}
      {esEdicionMasiva && !soloUbicacionEdit && !esEdicionMasivaAdminPreregistro && (
        <div className="col-span-1 rounded-lg border border-primary/25 bg-primary/5 p-4 text-sm text-foreground lg:col-span-2">
          Los cambios se aplicarán a los{" "}
          <strong>{ejemplaresTotal} ejemplares</strong> de este lote de compra. Cada unidad
          conserva su código de barras y serie propios.
        </div>
      )}
      {esEdicionMasiva && soloUbicacionEdit && (
        <div className="col-span-1 rounded-lg border border-primary/25 bg-primary/5 p-4 text-sm text-foreground lg:col-span-2">
          Se moverán los <strong>{ejemplaresTotal} ejemplares</strong> de este lote a la nueva
          ubicación.
        </div>
      )}

      {soloUbicacionEdit && activo && (
        <div className={`col-span-1 space-y-1 rounded-lg border border-border/50 bg-muted/20 p-4 ${colSpanFull}`}>
          <p className="font-semibold text-foreground">{activo.nombre}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {activo.codigo_barras ?? activo.codigo_catalogo}
          </p>
          <p className="text-xs text-muted-foreground">
            {esEdicionMasiva
              ? `Seleccione sede y ambiente. Se moverán los ${ejemplaresTotal} ejemplares.`
              : "Puede cambiar ubicación, estado del bien y agregar observaciones del administrador."}
          </p>
        </div>
      )}

      {esEdicionMasivaAdminPreregistro && activo && (
        <div className="col-span-1 space-y-1 rounded-lg border border-border/50 bg-muted/20 p-4 lg:col-span-2">
          <p className="font-semibold text-foreground">{activo.nombre}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {activo.codigo_catalogo}
            {activo.codigo_barras ? ` · ${activo.codigo_barras}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            {[activo.marca, activo.modelo, activo.color, activo.medidas].filter(Boolean).join(" · ") ||
              "Sin detalle físico adicional"}
          </p>
        </div>
      )}

      {esEdicionMasiva && !soloUbicacionEdit && !esEdicionMasivaAdminPreregistro && activo && (
      <>
      <div className="col-span-1 space-y-1 rounded-lg border border-border/50 bg-muted/20 p-4 lg:col-span-2">
        <p className="font-semibold text-foreground">{activo.nombre}</p>
        <p className="font-mono text-xs text-muted-foreground">
          {activo.codigo_catalogo}
          {activo.codigo_barras ? ` · ${activo.codigo_barras}` : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          {[activo.marca, activo.modelo, activo.color, activo.medidas].filter(Boolean).join(" · ") ||
            "Sin detalle físico adicional"}
        </p>
      </div>

      <fieldset className={fieldsetCompact}>
        <legend className={panelLegendClass}>Categoría</legend>
        <CategoriaBienSelector
          value={categoria}
          onChange={setCategoria}
          ayuda={CATEGORIA_BIEN_AYUDA}
          opciones={(["ACTIVO", "CUENTA_ORDEN"] as const).map((key) => ({
            key,
            ...CATEGORIA_BIEN_LABELS[key],
          }))}
        />
      </fieldset>

      <fieldset className={fieldsetCompact}>
        <legend className={panelLegendClass}>Valoración y documentación</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="valor_bulk">
              {valorEsMercado ? "Valor de mercado (S/)" : "Precio de adquisición (S/)"}
            </Label>
            <Input
              id="valor_bulk"
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
            <Label htmlFor="fecha_adquisicion_bulk">Fecha de adquisición</Label>
            <Input
              id="fecha_adquisicion_bulk"
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
              <Label htmlFor="comprobante_serie_bulk">Serie del comprobante</Label>
              <Input
                id="comprobante_serie_bulk"
                spellCheck={false}
                value={comprobanteSerie}
                onChange={(e) => setComprobanteSerie(formatComprobanteSerieInput(e.target.value))}
                placeholder="Ej. E001 - 1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comprobante_bulk">PDF del comprobante</Label>
              <FileInput
                id="comprobante_bulk"
                accept={ACTIVO_COMPROBANTE_ACCEPT}
                file={comprobanteFile}
                onFileChange={handleComprobanteFileSelect}
                buttonLabel="Seleccionar PDF"
                emptyLabel="Sin archivo adjunto"
                hint={
                  activo.comprobante_path && !comprobanteFile
                    ? "Ya hay un PDF en el lote"
                    : "Se aplicará a todas las unidades del lote"
                }
                canPreview={Boolean(comprobanteFile || activo.comprobante_path)}
                previewLabel="Previsualizar comprobante"
                onPreview={() => setComprobantePreviewOpen(true)}
              />
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="foto_bulk">Foto del activo</Label>
          <FileInput
            id="foto_bulk"
            accept={ACTIVO_FOTO_ACCEPT}
            file={fotoFile}
            onFileChange={setFotoFile}
            buttonLabel={
              activo.foto_path && !fotoFile ? "Cambiar foto" : "Seleccionar foto"
            }
            emptyLabel="Sin foto adjunta"
            hint={
              activo.foto_path && !fotoFile
                ? "Ya hay una foto en el lote. Puede elegir otra imagen para reemplazarla en todas las unidades."
                : "Se aplicará a todas las unidades. Formatos: JPG, PNG, WebP, GIF, BMP, HEIC, AVIF, TIFF."
            }
            canPreview={Boolean(fotoFile || activo.foto_path)}
            previewLabel="Previsualizar foto"
            onPreview={() => setFotoPreviewOpen(true)}
          />
        </div>
        {mostrarDepreciacion && (
          <div className="space-y-2">
            <Label htmlFor="depreciacion_bulk">Depreciación anual</Label>
            <PorcentajeInput
              id="depreciacion_bulk"
              value={depreciacion}
              onChange={handleDepreciacionChange}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="observacion_bulk">Observaciones</Label>
          <Textarea
            id="observacion_bulk"
            className="min-h-[80px]"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            placeholder="Notas adicionales, incidencias, condiciones especiales…"
          />
        </div>
      </fieldset>
      </>
      )}

      {!esEdicionMasiva && !soloUbicacionEdit && (
      <>
      {/* Identificación */}
      <fieldset className={fieldsetCompact}>
        <legend className={panelLegendClass}>Identificación</legend>

        {!fixedEntidadId && (
          <div className="space-y-2">
            <Label htmlFor="entidad_id">Entidad</Label>
            <Select
              id="entidad_id"
              required
              value={entidadId}
              onChange={setEntidadId}
              options={[
                { value: "", label: "Seleccione…" },
                ...entidades.map((e) => ({ value: e.id, label: e.nombre })),
              ]}
            />
          </div>
        )}

        <CatalogoPicker
          searchCatalogo={searchCatalogo}
          resolveCodigo={getCatalogoByCodigo}
          selectedCodigo={catalogo?.codigo}
          selectedDenominacion={catalogo?.denominacion}
          disabled={pending || esEdicionMasiva || Boolean(catalogoAlta)}
          onSelect={(item) => {
            setCatalogoAlta(null);
            if (item.origen === "PROPIO") {
              setCategoria("CUENTA_ORDEN");
            }
            setCatalogo(item);
          }}
          onClear={() => {
            if (esEdicionMasiva) return;
            setCatalogo(null);
            setNombre("");
            setNombreEtiqueta("");
            setDepreciacion("");
            setVidaUtilMeses("");
            setCuentaCodigo("");
            setCuentaNombre("");
          }}
          renderAddMissing={(q) => (
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <button
                type="button"
                className="font-medium text-primary underline-offset-2 hover:underline"
                onClick={() => setCatalogoAlta({ variant: "nacional", query: q })}
              >
                Crear en catálogo nacional
              </button>
              <button
                type="button"
                className="font-medium text-primary underline-offset-2 hover:underline"
                onClick={() => setCatalogoAlta({ variant: "propio", query: q })}
              >
                Crear en catálogo propio
              </button>
            </div>
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
          headerClassName={isGridForm ? "sm:col-span-2" : ""}
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

        {mostrarCuentaContable && (
          <CuentaContableFields
            codigo={cuentaCodigo}
            nombre={cuentaNombre}
            onCodigoChange={setCuentaCodigo}
            onNombreChange={setCuentaNombre}
            searchCuentas={searchCuentasContables}
            onCreateCuenta={upsertCuentaContable}
            disabled={pending || categoria === "CUENTA_ORDEN"}
            codigoId="activo_cuenta_codigo"
            allowCreateNew={categoria !== "CUENTA_ORDEN"}
          />
        )}

        {mostrarNombreEtiqueta && (
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
            El nombre del bien es largo para la etiqueta 50×25 mm. Indique un texto más corto; si
            queda vacío, se usará el nombre del bien.
          </p>
        </div>
        )}

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
          {!esEdicionMasiva && (
          <ActivoAtributoAutocomplete
            id="serie"
            label="Serie"
            campo="serie"
            value={serie}
            onChange={setSerie}
            onSearch={searchAtributo}
          />
          )}
          <ActivoAtributoAutocomplete
            id="color"
            label="Color"
            campo="color"
            value={color}
            onChange={setColor}
            onSearch={searchAtributo}
          />
        </div>
        <div className={detalleGridClass}>
          <div className="col-span-2 min-w-0">
            <ActivoAtributoAutocomplete
              id="medidas"
              label="Medidas"
              campo="medidas"
              value={medidas}
              onChange={setMedidas}
              onSearch={searchAtributo}
              placeholder='Ej. 65", 120 cm, 2.5 m, 20 L'
            />
          </div>
          <div className="col-span-2 min-w-0">
            <ActivoAtributoAutocomplete
              id="detalle"
              label="Detalle"
              campo="detalle"
              value={detalle}
              onChange={setDetalle}
              onSearch={searchAtributo}
              placeholder="Ej. con respaldo, tapizado en cuero…"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="estado_bien">Estado del bien</Label>
          <Select
            id="estado_bien"
            value={estadoBien}
            onChange={(value) => setEstadoBien(value as typeof estadoBien)}
            options={[
              { value: "BUENO", label: "Bueno" },
              { value: "REGULAR", label: "Regular" },
              { value: "MALO", label: "Malo" },
            ]}
          />
        </div>
        <div className="space-y-2 border-t border-border/50 pt-4">
          <Label>Nombre consolidado</Label>
          <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            {nombreConsolidado || "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            Nombre en mayúsculas; marca como se escribe; modelo, serie, color y medidas en
            minúsculas.
          </p>
        </div>
        <div className="space-y-2 border-t border-border/50 pt-4">
          <Label htmlFor="observacion">Observaciones</Label>
          <Textarea
            id="observacion"
            className="min-h-[80px]"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            placeholder="Notas adicionales, incidencias, condiciones especiales…"
          />
        </div>
      </fieldset>

      {/* Valoración */}
      <fieldset className={fieldsetCompact}>
        <legend className={panelLegendClass}>
          {esPreregistroAdmin
            ? "Valoración (opcional)"
            : categoria === "CUENTA_ORDEN"
              ? "Valoración"
              : "Valoración y depreciación"}
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
        {!valorEsMercado && !esEdicionMasiva && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="comprobante_serie">Serie del comprobante</Label>
              <Input
                id="comprobante_serie"
                spellCheck={false}
                value={comprobanteSerie}
                onChange={(e) => setComprobanteSerie(formatComprobanteSerieInput(e.target.value))}
                placeholder="Ej. E001 - 1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comprobante">PDF del comprobante</Label>
              <FileInput
                id="comprobante"
                accept={ACTIVO_COMPROBANTE_ACCEPT}
                file={comprobanteFile}
                onFileChange={handleComprobanteFileSelect}
                buttonLabel="Seleccionar PDF"
                emptyLabel="Sin archivo adjunto"
                hint={
                  isEdit && activo?.comprobante_path && !comprobanteFile
                    ? "Ya hay un PDF adjunto"
                    : undefined
                }
                canPreview={Boolean(comprobanteFile || (isEdit && activo?.comprobante_path))}
                previewLabel="Previsualizar comprobante"
                onPreview={() => setComprobantePreviewOpen(true)}
              />
            </div>
          </div>
        )}
        {!esEdicionMasiva && (
        <div className="space-y-2">
          <Label htmlFor="foto_activo">Foto del activo</Label>
          <FileInput
            id="foto_activo"
            accept={ACTIVO_FOTO_ACCEPT}
            file={fotoFile}
            onFileChange={setFotoFile}
            buttonLabel={
              isEdit && activo?.foto_path && !fotoFile ? "Cambiar foto" : "Seleccionar foto"
            }
            emptyLabel="Sin foto adjunta"
            hint={
              isEdit && activo?.foto_path && !fotoFile
                ? "Ya hay una foto. Puede elegir otra imagen (JPG, PNG, WebP, GIF, HEIC, etc.) para reemplazarla."
                : "Formatos: JPG, PNG, WebP, GIF, BMP, HEIC, AVIF, TIFF."
            }
            canPreview={Boolean(fotoFile || (isEdit && activo?.foto_path))}
            previewLabel="Previsualizar foto"
            onPreview={() => setFotoPreviewOpen(true)}
          />
        </div>
        )}
        {mostrarDepreciacion && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="depreciacion">Depreciación anual</Label>
                <PorcentajeInput
                  id="depreciacion"
                  value={depreciacion}
                  onChange={handleDepreciacionChange}
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

      </>
      )}

      {/* Posible ambiente (preregistro) */}
      {mostrarPosibleAmbiente && !soloUbicacionEdit && (
        <fieldset className={fieldsetWide}>
          <legend className={panelLegendClass}>Posible ambiente</legend>
          <p className="mb-3 text-sm text-muted-foreground">
            Indique dónde podría ubicarse el bien (opcional). Al validar el preregistro se podrá
            confirmar o elegir otro ambiente.
          </p>
          <div className="space-y-2">
            <Label htmlFor="posible_sede_id">Sucursal</Label>
            <Select
              id="posible_sede_id"
              value={posibleSedeId}
              onChange={(nextSede) => {
                setPosibleSedeId(nextSede);
                setPosibleAmbienteId("");
              }}
              options={[
                { value: "", label: "Todas las sucursales…" },
                ...sedes.map((s) => ({ value: s.id, label: s.nombre })),
                ...(posibleSedeId &&
                !sedes.some((s) => s.id === posibleSedeId) &&
                (activo as Activo & { posible_sede_nombre?: string })?.posible_sede_nombre
                  ? [
                      {
                        value: posibleSedeId,
                        label: (activo as Activo & { posible_sede_nombre?: string })
                          .posible_sede_nombre!,
                      },
                    ]
                  : []),
              ]}
            />
          </div>
          <div className="mt-3 space-y-2">
            <Label htmlFor="posible_ambiente_id">Ambiente</Label>
            <Select
              id="posible_ambiente_id"
              value={posibleAmbienteId}
              onChange={(nextAmbienteId) => {
                setPosibleAmbienteId(nextAmbienteId);
                if (!nextAmbienteId) return;
                const match = posibleAmbientes.find((a) => a.id === nextAmbienteId);
                if (match?.sede_id) setPosibleSedeId(match.sede_id);
              }}
              options={posibleAmbientesOpciones}
            />
          </div>
        </fieldset>
      )}

      {/* Ubicación */}
      {!hideUbicacion && (
      <fieldset className={fieldsetUbicacionAdmin}>
        <legend className={panelLegendClass}>Ubicación</legend>
        <div className={soloUbicacionEdit ? "grid gap-4" : undefined}>
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
        ) : mostrarSelectorSede ? (
          <div className="space-y-2">
            <Label htmlFor="sede_id">Sede</Label>
            <Select
              id="sede_id"
              required={soloUbicacionEdit}
              value={sedeId}
              onChange={(nextSede) => {
                setSedeId(nextSede);
                if (soloUbicacionEdit) setAmbienteId("");
              }}
              options={[
                { value: "", label: "Seleccione…" },
                ...sedes.map((s) => ({ value: s.id, label: s.nombre })),
              ]}
            />
          </div>
        ) : null}

        {sedeId && (
          <div className="space-y-2">
            <Label htmlFor="ambiente_id">Ambiente</Label>
            <Select
              id="ambiente_id"
              required={soloUbicacionEdit}
              value={ambienteId}
              onChange={setAmbienteId}
              options={[
                { value: "", label: "Seleccione…" },
                ...ambientes.map((a) => ({ value: a.id, label: a.nombre })),
              ]}
            />
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
        </div>
      </fieldset>
      )}

      {soloUbicacionEdit && !esEdicionMasiva && (
        <>
          <fieldset className={fieldsetCompact}>
            <legend className={panelLegendClass}>Estado del bien</legend>
            <div className="space-y-2">
              <Label htmlFor="estado_bien_admin">Estado</Label>
              <Select
                id="estado_bien_admin"
                value={estadoBien}
                onChange={(value) => setEstadoBien(value as typeof estadoBien)}
                options={[
                  { value: "BUENO", label: "Bueno" },
                  { value: "REGULAR", label: "Regular" },
                  { value: "MALO", label: "Malo" },
                ]}
              />
            </div>
          </fieldset>

          <fieldset className={fieldsetWide}>
            <legend className={panelLegendClass}>Observaciones</legend>
            <div className={`grid gap-4 ${soloUbicacionEdit ? "md:grid-cols-2" : "lg:grid-cols-2"}`}>
              {observacionPartes.contador ? (
                <div className="space-y-1 rounded-md border border-border/50 bg-muted/20 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Contador</p>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{observacionPartes.contador}</p>
                </div>
              ) : null}
              <div className={`space-y-2 ${observacionPartes.contador ? "" : soloUbicacionEdit ? "md:col-span-2" : "lg:col-span-2"}`}>
              <Label htmlFor="observacion_admin">Observación (administrador)</Label>
              <Textarea
                id="observacion_admin"
                className="min-h-[80px] text-blue-600 dark:text-blue-400"
                value={observacionAdmin}
                onChange={(e) => setObservacionAdmin(e.target.value)}
                placeholder="Notas del administrador. Si cambia el estado sin escribir nada, se registrará automáticamente."
              />
              <p className="text-xs text-muted-foreground">
                No puede modificar las observaciones del contador. Su texto se muestra en azul.
              </p>
              </div>
            </div>
          </fieldset>
        </>
      )}

      {message && !actionsBottomRight && (
        <p className={`col-span-1 text-sm ${colSpanFull} ${messageToneClass}`}>
          {message}
        </p>
      )}

      {actionsBottomRight ? (
        <div className={`col-span-1 flex flex-col items-end gap-2 ${soloUbicacionEdit ? "md:col-start-2" : "lg:col-start-2"}`}>
          {message && <p className={`text-sm ${messageToneClass}`}>{message}</p>}
          {formActionButtons}
        </div>
      ) : (
      <div className={isGridForm ? `col-span-1 flex flex-wrap gap-2 ${colSpanFull}` : undefined}>
        {formActionButtons}
      </div>
      )}
    </form>

    <Dialog
      open={Boolean(catalogoAlta)}
      onClose={() => setCatalogoAlta(null)}
      title={
        catalogoAlta?.variant === "nacional"
          ? "Nuevo ítem del catálogo nacional"
          : "Nuevo bien de cuenta de orden"
      }
      description={
        catalogoAlta?.variant === "nacional"
          ? "Se agregará al catálogo SBN y quedará seleccionado en este activo."
          : "Se agregará al catálogo propio y quedará seleccionado en este activo."
      }
      className={panelModalClass}
    >
      {catalogoAlta && (
        <CatalogoAltaPanel
          variant={catalogoAlta.variant}
          hideIntro
          initialDenominacion={
            catalogoAlta.variant === "nacional"
              ? parseCatalogoNacionalAltaPrefill(catalogoAlta.query).denominacion ?? ""
              : catalogoAlta.query
          }
          initialCodigo={
            catalogoAlta.variant === "nacional"
              ? parseCatalogoNacionalAltaPrefill(catalogoAlta.query).codigo ?? ""
              : ""
          }
          loadNextCodigo={
            catalogoAlta.variant === "propio" ? getNextCodigoCatalogoPropio : undefined
          }
          loadGrupos={listCatalogoGrupos}
          loadClases={listCatalogoClases}
          searchCuentasContables={searchCuentasContables}
          suggestGrupo={suggestCatalogoGrupo}
          onRegisterOpcionPersonalizada={registerCatalogoOpcionPersonalizada}
          onDeleteOpcionPersonalizada={deleteCatalogoOpcionPersonalizada}
          onSubmit={
            catalogoAlta.variant === "nacional"
              ? createCatalogoNacionalExtension
              : createCatalogoNacional
          }
          onCreateCuentaContable={upsertCuentaContable}
          onItemCreated={(item) => {
            if (item.origen === "PROPIO") {
              setCategoria("CUENTA_ORDEN");
            }
            setCatalogo(item);
            setCatalogoAlta(null);
          }}
        />
      )}
    </Dialog>

    <ComprobanteSerieDialog
      open={serieDialogOpen}
      file={pendingComprobanteFile}
      fileName={pendingComprobanteFile?.name}
      initialSerie={comprobanteSerie}
      initialFecha={fechaAdquisicion}
      initialMonto={valor}
      onConfirm={confirmComprobanteSerie}
      onCancel={cancelComprobanteSerie}
    />

    <FotoPreviewDialog
      open={fotoPreviewOpen}
      onClose={() => setFotoPreviewOpen(false)}
      file={fotoFile}
      path={!fotoFile ? activo?.foto_path : null}
      titulo={nombreConsolidado || "Foto del activo"}
    />

    <PdfPreviewDialog
      open={comprobantePreviewOpen}
      onClose={() => setComprobantePreviewOpen(false)}
      file={comprobanteFile}
      path={!comprobanteFile ? activo?.comprobante_path : null}
      titulo={
        comprobanteSerie.trim()
          ? `Comprobante ${comprobanteSerie.trim()}`
          : "Comprobante de adquisición"
      }
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
