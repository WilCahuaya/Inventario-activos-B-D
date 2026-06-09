import { useCallback, useEffect, useState } from "react";
import type { CatalogoNacional, CategoriaBien } from "@inventario/types";
import {
  formatFechaISOToDDMMYYYY,
  parseFechaDDMMYYYY,
  validarFechaDDMMYYYY,
  vidaUtilMesesFromPorcentaje,
  parsePorcentajeDepreciacion,
} from "@inventario/types";
import { Button, Input, Label } from "@inventario/ui";
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
import { getCatalogoByCodigo } from "../lib/catalogo";
import { CatalogoPickerLocal } from "./CatalogoPickerLocal";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

interface ActivoFormDesktopProps {
  entidadId: string;
  activo?: ActivoConUbicacion;
  initialCatalogoCodigo?: string;
  onSuccess: (activo: ActivoConUbicacion) => void;
  onCancel: () => void;
}

export function ActivoFormDesktop({
  entidadId,
  activo,
  initialCatalogoCodigo,
  onSuccess,
  onCancel,
}: ActivoFormDesktopProps) {
  const isEdit = Boolean(activo);
  const [catalogo, setCatalogo] = useState<CatalogoNacional | null>(null);
  const [nombre, setNombre] = useState(activo?.nombre ?? "");
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
  const [observacion, setObservacion] = useState(activo?.observacion ?? "");
  const [comprobanteSerie, setComprobanteSerie] = useState(activo?.comprobante_serie ?? "");
  const [sedes, setSedes] = useState<{ id: string; nombre: string }[]>([]);
  const [ambientes, setAmbientes] = useState<{ id: string; nombre: string }[]>([]);
  const [sedeId, setSedeId] = useState(activo?.sede_id ?? "");
  const [ambienteId, setAmbienteId] = useState(activo?.ambiente_id ?? "");
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
      setMessage("Seleccione un ítem del catálogo.");
      return;
    }

    const fechaError = validarFechaDDMMYYYY(fechaAdquisicion);
    if (fechaError) {
      setMessage(fechaError);
      return;
    }

    setPending(true);
    setMessage(null);

    const payload = {
      codigo_catalogo: catalogo.codigo,
      nombre: nombre.trim() || catalogo.denominacion,
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
      comprobante_serie: comprobanteSerie.trim() || undefined,
      sede_id: sedeId || undefined,
      ambiente_id: ambienteId || undefined,
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

      if (comprobanteFile) {
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
        descripcion: activo?.descripcion ?? null,
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
        comprobante_path: activo?.comprobante_path ?? null,
        comprobante_serie: payload.comprobante_serie ?? null,
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

    if (comprobanteFile) {
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
    onSuccess(mapped);
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      <CatalogoPickerLocal
        onSelect={handleCatalogoSelect}
        onClear={() => setCatalogo(null)}
        selectedCodigo={catalogo?.codigo ?? activo?.codigo_catalogo}
        selectedDenominacion={catalogo?.denominacion}
      />

      {!isEdit && codigoBarrasPreview && (
        <p className="text-sm text-muted-foreground">
          Código de barras previsto: <strong className="font-mono">{codigoBarrasPreview}</strong>
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="nombre">Nombre del bien</Label>
          <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="categoria">Categoría</Label>
          <select
            id="categoria"
            className={selectClass}
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as CategoriaBien)}
          >
            <option value="ACTIVO">Activo</option>
            <option value="CUENTA_ORDEN">Cuenta de orden</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="estado_bien">Estado del bien</Label>
          <select
            id="estado_bien"
            className={selectClass}
            value={estadoBien}
            onChange={(e) => setEstadoBien(e.target.value as "BUENO" | "REGULAR" | "MALO")}
          >
            <option value="BUENO">Bueno</option>
            <option value="REGULAR">Regular</option>
            <option value="MALO">Malo</option>
          </select>
        </div>
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
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="medidas">Medidas</Label>
          <Input id="medidas" value={medidas} onChange={(e) => setMedidas(e.target.value)} />
        </div>
      </div>

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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="valor">Valor (S/)</Label>
          <Input
            id="valor"
            type="number"
            step="0.01"
            min="0"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fecha">Fecha adquisición</Label>
          <Input
            id="fecha"
            placeholder="DD/MM/AAAA"
            value={fechaAdquisicion}
            onChange={(e) => setFechaAdquisicion(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="depreciacion">Depreciación anual</Label>
          <Input
            id="depreciacion"
            value={depreciacion}
            onChange={(e) => {
              setDepreciacion(e.target.value);
              const pct = parsePorcentajeDepreciacion(e.target.value);
              if (pct) setVidaUtilMeses(String(vidaUtilMesesFromPorcentaje(pct)));
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vida_util">Vida útil (meses)</Label>
          <Input
            id="vida_util"
            type="number"
            value={vidaUtilMeses}
            onChange={(e) => setVidaUtilMeses(e.target.value)}
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={valorEsMercado}
              onChange={(e) => setValorEsMercado(e.target.checked)}
            />
            Valor de mercado
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="comprobante_serie">Serie comprobante</Label>
          <Input
            id="comprobante_serie"
            value={comprobanteSerie}
            onChange={(e) => setComprobanteSerie(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="comprobante">PDF comprobante</Label>
          <Input
            id="comprobante"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(e) => setComprobanteFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="foto">Foto del activo</Label>
          <Input
            id="foto"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFotoFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="observacion">Observación</Label>
          <Input id="observacion" value={observacion} onChange={(e) => setObservacion(e.target.value)} />
        </div>
      </div>

      {message && <p className="text-sm text-destructive">{message}</p>}

      <div className="flex flex-wrap gap-2">
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
