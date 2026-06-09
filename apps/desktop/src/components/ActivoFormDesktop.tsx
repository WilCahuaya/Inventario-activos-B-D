import { useCallback, useEffect, useMemo, useState } from "react";
import type { CatalogoNacional, CategoriaBien } from "@inventario/types";
import {
  CATEGORIA_BIEN_AYUDA,
  CATEGORIA_BIEN_LABELS,
  buildNombreConsolidado,
  calcDepreciacionAcumulada,
  calcPeriodoMeses,
  calcValorNeto,
  formatFechaInputDDMMYYYY,
  formatFechaISOToDDMMYYYY,
  formatPorcentajeDepreciacion,
  parseFechaDDMMYYYY,
  parsePorcentajeDepreciacion,
  porcentajeFromVidaUtilMeses,
  validarFechaDDMMYYYY,
  vidaUtilMesesFromPorcentaje,
} from "@inventario/types";
import {
  ActivoAtributoAutocomplete,
  Button,
  CategoriaBienSelector,
  Input,
  Label,
} from "@inventario/ui";
import { panelFieldsetClass, panelLegendClass } from "@inventario/ui/panel";
import type { ActivoConUbicacion } from "../lib/activos";
import {
  createActivo,
  previewCodigoBarras,
  updateActivo,
} from "../lib/activos";
import { createAmbiente, listAmbientes, listSedes } from "../lib/ubicacion";
import {
  enqueueOfflineCreate,
  enqueueOfflineUpdate,
  fileToBase64,
  upsertCachedActivo,
} from "../lib/offline";
import { updateActivoPaths, uploadActivoFile } from "../lib/storage";
import { suggestActivoAtributo, upsertLocalAtributosFromActivo } from "../lib/atributo-vocab";
import { getCatalogoByCodigo } from "../lib/catalogo";
import { CatalogoPickerLocal } from "./CatalogoPickerLocal";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

const textareaClass =
  "flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const fieldsetCompact = `${panelFieldsetClass} lg:col-span-1`;
const fieldsetWide = `${panelFieldsetClass} col-span-1 lg:col-span-2`;
const fieldsetNotas = `${panelFieldsetClass} lg:col-span-1 lg:flex lg:flex-col`;
const detalleGridClass = "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4";
const textareaModalClass = `${textareaClass} min-h-[100px] sm:min-h-[120px] lg:min-h-[160px] lg:flex-1`;

function formatSoles(value: number | null) {
  if (value == null) return "—";
  return `S/ ${value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface ActivoFormDesktopProps {
  entidadId: string;
  fixedSedeId?: string;
  fixedAmbienteId?: string;
  activo?: ActivoConUbicacion;
  initialCatalogoCodigo?: string;
  onSuccess: (activo: ActivoConUbicacion) => void;
  onCancel: () => void;
}

export function ActivoFormDesktop({
  entidadId,
  fixedSedeId,
  fixedAmbienteId,
  activo,
  initialCatalogoCodigo,
  onSuccess,
  onCancel,
}: ActivoFormDesktopProps) {
  const isEdit = Boolean(activo);
  const hideUbicacion = Boolean(fixedSedeId && fixedAmbienteId);
  const [catalogo, setCatalogo] = useState<CatalogoNacional | null>(null);
  const [nombre, setNombre] = useState(activo?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(activo?.descripcion ?? "");
  const [categoria, setCategoria] = useState<CategoriaBien>(activo?.categoria ?? "ACTIVO");
  const [estadoBien, setEstadoBien] = useState<"BUENO" | "REGULAR" | "MALO">(
    activo?.estado_bien ?? "BUENO",
  );
  const [marca, setMarca] = useState(activo?.marca ?? "");
  const [modelo, setModelo] = useState(activo?.modelo ?? "");
  const [serie, setSerie] = useState(activo?.serie ?? "");
  const [color, setColor] = useState(activo?.color ?? "");
  const [medidas, setMedidas] = useState(activo?.medidas ?? "");
  const [depreciacion, setDepreciacion] = useState(activo?.depreciacion ?? "");
  const [vidaUtilMeses, setVidaUtilMeses] = useState(
    activo?.vida_util_meses != null ? String(activo.vida_util_meses) : "",
  );
  const [valor, setValor] = useState(
    activo?.valor_adquisicion != null ? String(activo.valor_adquisicion) : "",
  );
  const [valorEsMercado, setValorEsMercado] = useState(activo?.valor_es_mercado ?? false);
  const [fechaAdquisicion, setFechaAdquisicion] = useState(
    formatFechaISOToDDMMYYYY(activo?.fecha_adquisicion),
  );
  const [fechaAdquisicionError, setFechaAdquisicionError] = useState<string | null>(null);
  const [observacion, setObservacion] = useState(activo?.observacion ?? "");
  const [comprobanteSerie, setComprobanteSerie] = useState(activo?.comprobante_serie ?? "");
  const [sedes, setSedes] = useState<{ id: string; nombre: string }[]>([]);
  const [ambientes, setAmbientes] = useState<{ id: string; nombre: string }[]>([]);
  const [sedeId, setSedeId] = useState(fixedSedeId ?? activo?.sede_id ?? "");
  const [ambienteId, setAmbienteId] = useState(fixedAmbienteId ?? activo?.ambiente_id ?? "");
  const [nuevoAmbiente, setNuevoAmbiente] = useState("");
  const [codigoBarrasPreview, setCodigoBarrasPreview] = useState<string | null>(
    activo?.codigo_barras ?? null,
  );
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void listSedes(entidadId).then(setSedes);
  }, [entidadId]);

  useEffect(() => {
    if (!sedeId) {
      setAmbientes([]);
      return;
    }
    void listAmbientes(sedeId).then(setAmbientes);
  }, [sedeId]);

  useEffect(() => {
    if (activo?.codigo_catalogo && !catalogo) {
      setCatalogo({
        codigo: activo.codigo_catalogo,
        denominacion: activo.nombre,
        grupo: null,
        clase: null,
        cuenta_codigo: null,
        contabilidad: null,
        depreciacion: activo.depreciacion,
        resolucion: null,
        estado: null,
      });
    }
  }, [activo, catalogo]);

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

  const searchAtributo = useCallback(
    (campo: "marca" | "modelo" | "serie" | "color", query: string) =>
      suggestActivoAtributo(campo, query),
    [],
  );

  const handleCatalogoSelect = useCallback(
    (item: CatalogoNacional) => {
      setCatalogo(item);
      setNombre(item.denominacion);
      if (item.depreciacion) {
        setDepreciacion(item.depreciacion);
        const pct = parsePorcentajeDepreciacion(item.depreciacion);
        if (pct) setVidaUtilMeses(String(vidaUtilMesesFromPorcentaje(pct)));
      }
      if (!isEdit) {
        void previewCodigoBarras(entidadId, item.codigo).then(setCodigoBarrasPreview);
      }
    },
    [entidadId, isEdit],
  );

  useEffect(() => {
    if (initialCatalogoCodigo && !isEdit) {
      void getCatalogoByCodigo(initialCatalogoCodigo).then((item) => {
        if (item) handleCatalogoSelect(item);
      });
    }
  }, [initialCatalogoCodigo, isEdit, handleCatalogoSelect]);

  function handleCatalogoClear() {
    setCatalogo(null);
    setNombre("");
    setDepreciacion("");
    setVidaUtilMeses("");
    if (!isEdit) setCodigoBarrasPreview(null);
  }

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

  function handleValorEsMercadoChange(checked: boolean) {
    setValorEsMercado(checked);
    if (checked) {
      setComprobanteSerie("");
      setComprobanteFile(null);
    }
  }

  async function handleCrearAmbiente() {
    if (!sedeId || !nuevoAmbiente.trim()) return;
    setMessage(null);
    const result = await createAmbiente({ sedeId, nombre: nuevoAmbiente });
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setAmbientes((prev) => [...prev, result.data!]);
    setAmbienteId(result.data!.id);
    setNuevoAmbiente("");
    setMessage(`Ambiente «${result.data!.nombre}» creado.`);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!catalogo) {
      setMessage("Seleccione un ítem del catálogo nacional.");
      return;
    }

    const fechaError = validarFechaDDMMYYYY(fechaAdquisicion);
    if (fechaError) {
      setFechaAdquisicionError(fechaError);
      setMessage(fechaError);
      return;
    }

    setPending(true);
    setMessage(null);

    const payload = {
      codigo_catalogo: catalogo.codigo,
      nombre: nombre.trim() || catalogo.denominacion,
      descripcion: descripcion || undefined,
      categoria,
      estado_bien: estadoBien,
      marca: marca || undefined,
      modelo: modelo || undefined,
      serie: serie || undefined,
      color: color || undefined,
      medidas: medidas || undefined,
      depreciacion: depreciacion || undefined,
      vida_util_meses: vidaUtilMeses ? Number(vidaUtilMeses) : undefined,
      observacion: observacion || undefined,
      valor_adquisicion: valor ? Number(valor) : undefined,
      valor_es_mercado: valorEsMercado,
      fecha_adquisicion: parseFechaDDMMYYYY(fechaAdquisicion) || undefined,
      ...(!valorEsMercado && { comprobante_serie: comprobanteSerie.trim() || undefined }),
      sede_id: (fixedSedeId ?? sedeId) || undefined,
      ambiente_id: (fixedAmbienteId ?? ambienteId) || undefined,
    };

    const sedeNombre = sedes.find((s) => s.id === sedeId)?.nombre;
    const ambienteNombre = ambientes.find((a) => a.id === ambienteId)?.nombre;
    const online = navigator.onLine;

    if (!online) {
      const files: {
        fotoBase64?: string;
        fotoName?: string;
        fotoType?: string;
        comprobanteBase64?: string;
        comprobanteName?: string;
        comprobanteType?: string;
      } = {};

      if (!valorEsMercado && comprobanteFile) {
        files.comprobanteBase64 = await fileToBase64(comprobanteFile);
        files.comprobanteName = comprobanteFile.name;
        files.comprobanteType = comprobanteFile.type;
      }
      if (fotoFile) {
        files.fotoBase64 = await fileToBase64(fotoFile);
        files.fotoName = fotoFile.name;
        files.fotoType = fotoFile.type;
      }

      const localActivo: ActivoConUbicacion = {
        ...(activo ?? ({} as ActivoConUbicacion)),
        id: activo?.id ?? `pending-${crypto.randomUUID()}`,
        entidad_id: entidadId,
        sede_id: sedeId || null,
        ambiente_id: ambienteId || null,
        codigo_catalogo: payload.codigo_catalogo,
        correlativo: activo?.correlativo ?? null,
        codigo_barras: activo?.codigo_barras ?? codigoBarrasPreview,
        nombre: payload.nombre,
        descripcion: payload.descripcion ?? null,
        caracteristicas: activo?.caracteristicas ?? null,
        marca: payload.marca ?? null,
        modelo: payload.modelo ?? null,
        serie: payload.serie ?? null,
        color: payload.color ?? null,
        medidas: payload.medidas ?? null,
        medida_largo: activo?.medida_largo ?? null,
        medida_ancho: activo?.medida_ancho ?? null,
        medida_altura: activo?.medida_altura ?? null,
        depreciacion: payload.depreciacion ?? null,
        observacion: payload.observacion ?? null,
        responsable: activo?.responsable ?? null,
        valor_es_mercado: payload.valor_es_mercado ?? false,
        estado_registro: activo?.estado_registro ?? "REGISTRADO",
        estado_bien: payload.estado_bien ?? "BUENO",
        categoria: payload.categoria ?? "ACTIVO",
        valor_adquisicion: payload.valor_adquisicion ?? null,
        fecha_adquisicion: payload.fecha_adquisicion ?? null,
        vida_util_meses: payload.vida_util_meses ?? null,
        foto_path: activo?.foto_path ?? null,
        comprobante_path: valorEsMercado ? null : (activo?.comprobante_path ?? null),
        comprobante_serie: valorEsMercado ? null : (payload.comprobante_serie ?? null),
        motivo_baja: activo?.motivo_baja ?? null,
        created_by: activo?.created_by ?? "",
        updated_by: activo?.updated_by ?? null,
        created_at: activo?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sede_nombre: sedeNombre,
        ambiente_nombre: ambienteNombre,
      };

      const queuePayload = {
        input: payload,
        files: Object.keys(files).length > 0 ? files : undefined,
        localActivo,
      };

      if (isEdit && activo) {
        await enqueueOfflineUpdate(entidadId, activo.id, queuePayload);
      } else {
        await enqueueOfflineCreate(entidadId, queuePayload);
      }

      await upsertCachedActivo(entidadId, localActivo);
      upsertLocalAtributosFromActivo({
        marca: payload.marca,
        modelo: payload.modelo,
        serie: payload.serie,
        color: payload.color,
      });
      setPending(false);
      setMessage("Guardado en cola offline. Se sincronizará al reconectar.");
      onSuccess(localActivo);
      return;
    }

    const result =
      isEdit && activo
        ? await updateActivo(activo.id, payload)
        : await createActivo({ entidad_id: entidadId, ...payload });

    if (result.error) {
      setPending(false);
      setMessage(result.error);
      return;
    }

    const activoId = isEdit && activo ? activo.id : result.data!.id;

    if (valorEsMercado) {
      if (activo?.comprobante_path || activo?.comprobante_serie) {
        await updateActivoPaths(activoId, {
          comprobante_path: null,
          comprobante_serie: null,
        });
      }
    } else if (comprobanteFile) {
      const upload = await uploadActivoFile(entidadId, activoId, comprobanteFile, "comprobante");
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
      const upload = await uploadActivoFile(entidadId, activoId, fotoFile, "foto");
      if (upload.path) {
        await updateActivoPaths(activoId, { foto_path: upload.path });
      }
    }

    setPending(false);
    const saved = result.data!;
    const mapped = {
      ...saved,
      sede_nombre: sedeNombre,
      ambiente_nombre: ambienteNombre,
    };
    await upsertCachedActivo(entidadId, mapped);
    upsertLocalAtributosFromActivo({
      marca: payload.marca,
      modelo: payload.modelo,
      serie: payload.serie,
      color: payload.color,
    });
    onSuccess(mapped);
  }

  const codigoBarrasDisplay =
    activo?.codigo_barras ?? codigoBarrasPreview ?? "Seleccione catálogo…";

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-2"
    >
      <fieldset className={fieldsetCompact}>
        <legend className={panelLegendClass}>Identificación</legend>

        <CatalogoPickerLocal
          onSelect={handleCatalogoSelect}
          onClear={handleCatalogoClear}
          selectedCodigo={catalogo?.codigo ?? activo?.codigo_catalogo}
          selectedDenominacion={catalogo?.denominacion}
          disabled={pending}
        />

        <div className="space-y-2">
          <Label>Código de barras</Label>
          <Input readOnly value={codigoBarrasDisplay} className="bg-muted font-mono text-sm" />
        </div>

        <CategoriaBienSelector
          value={categoria}
          onChange={setCategoria}
          ayuda={CATEGORIA_BIEN_AYUDA}
          opciones={(["ACTIVO", "CUENTA_ORDEN"] as const).map((key) => ({
            key,
            ...CATEGORIA_BIEN_LABELS[key],
          }))}
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
      </fieldset>

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

      <fieldset className={fieldsetCompact}>
        <legend className={panelLegendClass}>Valoración y depreciación</legend>
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
                onChange={(e) => setComprobanteFile(e.target.files?.[0] ?? null)}
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
      </fieldset>

      <fieldset className={fieldsetNotas}>
        <legend className={panelLegendClass}>Descripción y observación (opcional)</legend>
        <div className="flex flex-col gap-4 lg:flex-1 lg:flex-col">
          <div className="space-y-2 lg:flex lg:flex-1 lg:flex-col">
            <Label htmlFor="descripcion">Descripción</Label>
            <textarea
              id="descripcion"
              className={textareaModalClass}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Uso, ubicación física, detalle general…"
            />
          </div>
          <div className="space-y-2 lg:flex lg:flex-1 lg:flex-col">
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

      {!hideUbicacion && (
      <fieldset className={fieldsetWide}>
        <legend className={panelLegendClass}>Ubicación</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sede">Sede</Label>
            <select
              id="sede"
              className={selectClass}
              value={sedeId}
              onChange={(e) => {
                setSedeId(e.target.value);
                setAmbienteId("");
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
          <div className="space-y-2">
            <Label htmlFor="ambiente">Ambiente</Label>
            <select
              id="ambiente"
              className={selectClass}
              value={ambienteId}
              onChange={(e) => setAmbienteId(e.target.value)}
              disabled={!sedeId}
            >
              <option value="">Seleccione…</option>
              {ambientes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
            {sedeId && (
              <div className="flex flex-wrap gap-2 pt-1">
                <Input
                  placeholder="Nuevo ambiente"
                  value={nuevoAmbiente}
                  onChange={(e) => setNuevoAmbiente(e.target.value)}
                  className="max-w-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!nuevoAmbiente.trim()}
                  onClick={() => void handleCrearAmbiente()}
                >
                  Agregar ambiente
                </Button>
              </div>
            )}
          </div>
        </div>
      </fieldset>
      )}

      {message && (
        <p
          className={`col-span-1 text-sm lg:col-span-2 ${
            message.includes("Error") ||
            message.includes("obligator") ||
            message.includes("Seleccione") ||
            message.includes("fecha")
              ? "text-destructive"
              : "text-primary"
          }`}
        >
          {message}
        </p>
      )}

      <div className="col-span-1 flex flex-wrap gap-2 lg:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : isEdit ? "Guardar cambios" : "Registrar activo"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
