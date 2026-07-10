import { useCallback, useEffect, useState } from "react";
import { formatEjemplaresEnAmbienteTexto } from "@inventario/types";
import { ActivoDetalleSheet } from "@inventario/ui/panel";
import { EliminarPreregistroDialog, useToast, mensajeEliminacionPreregistros, ActivoHistorialPanel } from "@inventario/ui";
import type { HistorialActivoItem, HistorialLookupMaps } from "@inventario/types";
import { listHistorialActivo } from "../lib/historial";
import {
  deleteActivoPreregistrado,
  getActivoById,
  getEjemplaresSimilaresResumen,
  listActivosSimilaresParaEtiquetas,
  type ActivoConUbicacion,
} from "../lib/activos";
import { FotoPreviewDialog, PdfPreviewDialog } from "./ActivoMediaDialogs";
import { CambiarAmbienteDialog } from "./CambiarAmbienteDialog";
import { DarDeBajaDialog } from "./DarDeBajaDialog";
import { RecuperarActivoDialog } from "./RecuperarActivoDialog";
import { ValidarPreregistroDialog } from "./ValidarPreregistroDialog";
import { AgregarBienesSimilaresDialog, type AmbienteDestinoNavigation } from "./AgregarBienesSimilaresDialog";
import {
  ActivoIconButton,
  IconAmbiente,
  IconEditar,
  IconEliminar,
  IconEtiqueta,
  IconInactivo,
  IconRecuperar,
  IconSimilares,
  IconValidar,
} from "./activo-icons";

interface ActivoDetalleModalProps {
  activo: ActivoConUbicacion;
  entidadId: string;
  open: boolean;
  onClose: () => void;
  online: boolean;
  onEdit?: (activo: ActivoConUbicacion) => void;
  onIrAmbiente?: (activo: ActivoConUbicacion) => void;
  onAbrirAmbienteDestino?: (destino: AmbienteDestinoNavigation) => void;
  onActivoUpdated?: (activo: ActivoConUbicacion) => void;
  onActivoDeleted?: () => void;
  onActivoEliminado?: (activoId: string) => void;
  onPrintLabel?: (activo: ActivoConUbicacion) => void;
  onPrintBatch?: (activos: ActivoConUbicacion[]) => void;
}

export function ActivoDetalleModal({
  activo,
  entidadId,
  open,
  onClose,
  online,
  onEdit,
  onIrAmbiente,
  onAbrirAmbienteDestino,
  onActivoUpdated,
  onActivoDeleted,
  onActivoEliminado,
  onPrintLabel,
  onPrintBatch,
}: ActivoDetalleModalProps) {
  const { pushToast } = useToast();
  const [fotoOpen, setFotoOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [validarOpen, setValidarOpen] = useState(false);
  const [bajaOpen, setBajaOpen] = useState(false);
  const [recuperarOpen, setRecuperarOpen] = useState(false);
  const [cambiarAmbienteOpen, setCambiarAmbienteOpen] = useState(false);
  const [similaresOpen, setSimilaresOpen] = useState(false);
  const [eliminarOpen, setEliminarOpen] = useState(false);
  const [ejemplaresLoading, setEjemplaresLoading] = useState(false);
  const [printEjemplaresPending, setPrintEjemplaresPending] = useState(false);
  const [ejemplares, setEjemplares] = useState<{
    total: number;
    registrados: number;
    preregistrados: number;
  } | null>(null);
  const [historial, setHistorial] = useState<HistorialActivoItem[]>([]);
  const [historialLookups, setHistorialLookups] = useState<HistorialLookupMaps>({
    sedes: {},
    ambientes: {},
  });
  const [historialLoading, setHistorialLoading] = useState(false);
  const [historialError, setHistorialError] = useState<string | null>(null);

  const esPendiente = activo.id.startsWith("pending-");
  const esPreregistrado = activo.estado_registro === "PREREGISTRADO";
  const inactivo = activo.estado_registro === "DADO_DE_BAJA";

  const reloadEjemplares = useCallback(() => {
    setEjemplaresLoading(true);
    void getEjemplaresSimilaresResumen(activo.id)
      .then(setEjemplares)
      .finally(() => setEjemplaresLoading(false));
  }, [activo.id]);

  function loadHistorial() {
    if (!online) {
      setHistorial([]);
      setHistorialLookups({ sedes: {}, ambientes: {} });
      setHistorialError(null);
      setHistorialLoading(false);
      return;
    }
    setHistorialLoading(true);
    setHistorialError(null);
    void listHistorialActivo(activo.id)
      .then((result) => {
        if (result.error) {
          setHistorialError(result.error);
          return;
        }
        setHistorial(result.data?.items ?? []);
        setHistorialLookups(result.data?.lookups ?? { sedes: {}, ambientes: {} });
      })
      .finally(() => setHistorialLoading(false));
  }

  useEffect(() => {
    if (!open) return;
    reloadEjemplares();
    loadHistorial();
  }, [open, reloadEjemplares, online, activo.id]);

  async function refreshActivo() {
    reloadEjemplares();
    loadHistorial();
    const updated = await getActivoById(activo.id);
    if (updated && onActivoUpdated) onActivoUpdated(updated);
  }

  async function handleImprimirEjemplares() {
    if (!onPrintBatch) return;
    setPrintEjemplaresPending(true);
    try {
      const activos = await listActivosSimilaresParaEtiquetas(activo.id);
      if (activos.length > 0) onPrintBatch(activos);
    } finally {
      setPrintEjemplaresPending(false);
    }
  }

  const banner = (
    <>
      {esPendiente && (
        <p className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm">
          Cambio pendiente de sincronizar con el servidor.
        </p>
      )}
      {esPreregistrado && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
          Este bien está <strong>preregistrado</strong>. Complételo y valídelo para asignar código de
          barras.
        </p>
      )}
      {inactivo && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-foreground">
          Este bien está <strong>dado de baja</strong>
          {activo.motivo_baja?.trim() ? (
            <>
              : <span className="text-muted-foreground">{activo.motivo_baja}</span>
            </>
          ) : (
            "."
          )}
        </p>
      )}
    </>
  );

  const ejemplaresHint =
    !ejemplaresLoading && ejemplares && ejemplares.total > 0 ? (
      <span className="shrink-0 text-xs font-medium text-sky-600 dark:text-sky-300">
        {formatEjemplaresEnAmbienteTexto(ejemplares)}
      </span>
    ) : null;

  const footer = (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {onIrAmbiente && activo.ambiente_id && (
        <ActivoIconButton
          label="Ir al ambiente"
          variant="primary"
          onClick={() => {
            onClose();
            onIrAmbiente(activo);
          }}
        >
          <IconAmbiente />
        </ActivoIconButton>
      )}
      {esPreregistrado && (
        <ActivoIconButton
          label={online ? "Validar preregistro" : "Validar preregistro (requiere conexión)"}
          variant="primary"
          disabled={!online}
          onClick={() => setValidarOpen(true)}
        >
          <IconValidar />
        </ActivoIconButton>
      )}
      {esPreregistrado && online && !esPendiente && (
        <ActivoIconButton
          label="Eliminar preregistro"
          variant="danger"
          onClick={() => setEliminarOpen(true)}
        >
          <IconEliminar />
        </ActivoIconButton>
      )}
      {!inactivo && onEdit && (
        <ActivoIconButton
          label={esPreregistrado ? "Editar preregistro" : "Editar activo"}
          variant={esPreregistrado ? "default" : "primary"}
          onClick={() => {
            onClose();
            onEdit(activo);
          }}
        >
          <IconEditar />
        </ActivoIconButton>
      )}
      {!inactivo && (
        <ActivoIconButton
          label="Agregar similares"
          disabled={!online || esPendiente}
          onClick={() => setSimilaresOpen(true)}
        >
          <IconSimilares />
        </ActivoIconButton>
      )}
      {onPrintBatch && (ejemplares?.registrados ?? 0) > 0 && (
        <ActivoIconButton
          label={
            printEjemplaresPending
              ? "Preparando etiquetas…"
              : `Imprimir ejemplares (${ejemplares?.registrados ?? 0})`
          }
          disabled={!online || esPendiente || printEjemplaresPending}
          onClick={() => void handleImprimirEjemplares()}
        >
          <IconEtiqueta />
        </ActivoIconButton>
      )}
      {!inactivo && !esPreregistrado && (
        <ActivoIconButton
          label="Cambiar ambiente"
          disabled={!online}
          onClick={() => setCambiarAmbienteOpen(true)}
        >
          <IconAmbiente />
        </ActivoIconButton>
      )}
      {!inactivo && !esPreregistrado && (
        <ActivoIconButton
          label="Dar de baja"
          variant="danger"
          disabled={!online || esPendiente}
          onClick={() => setBajaOpen(true)}
        >
          <IconInactivo />
        </ActivoIconButton>
      )}
      {inactivo && (
        <ActivoIconButton
          label={online ? "Recuperar activo" : "Recuperar activo (requiere conexión)"}
          variant="primary"
          disabled={!online || esPendiente}
          onClick={() => setRecuperarOpen(true)}
        >
          <IconRecuperar />
        </ActivoIconButton>
      )}
      {!inactivo && onPrintLabel && activo.codigo_barras && (
        <ActivoIconButton label="Imprimir etiqueta" variant="primary" onClick={() => onPrintLabel(activo)}>
          <IconEtiqueta />
        </ActivoIconButton>
      )}
    </div>
  );

  return (
    <>
      <ActivoDetalleSheet
        activo={activo}
        open={open}
        onClose={onClose}
        footer={footer}
        banner={banner}
        ejemplaresHint={ejemplaresHint}
        extraSections={
          <ActivoHistorialPanel
            loading={historialLoading}
            offline={!online}
            error={historialError}
            items={historial}
            lookups={historialLookups}
          />
        }
        onVerFoto={activo.foto_path ? () => setFotoOpen(true) : undefined}
        onVerComprobante={activo.comprobante_path ? () => setPdfOpen(true) : undefined}
      />

      {activo.foto_path && (
        <FotoPreviewDialog
          open={fotoOpen}
          onClose={() => setFotoOpen(false)}
          path={activo.foto_path}
          titulo={activo.nombre}
        />
      )}

      {activo.comprobante_path && (
        <PdfPreviewDialog
          open={pdfOpen}
          onClose={() => setPdfOpen(false)}
          path={activo.comprobante_path}
          titulo={activo.comprobante_serie ? `Comprobante ${activo.comprobante_serie}` : undefined}
        />
      )}

      {esPreregistrado && (
        <ValidarPreregistroDialog
          open={validarOpen}
          onClose={() => setValidarOpen(false)}
          entidadId={entidadId}
          activoId={activo.id}
          nombre={activo.nombre}
          codigoCatalogo={activo.codigo_catalogo}
          posibleAmbienteId={activo.posible_ambiente_id}
          posibleAmbienteNombre={activo.posible_ambiente_nombre}
          onSuccess={() => {
            void refreshActivo();
          }}
        />
      )}

      <DarDeBajaDialog
        open={bajaOpen}
        onClose={() => setBajaOpen(false)}
        activoId={activo.id}
        nombre={activo.nombre}
        onSuccess={() => void refreshActivo()}
      />

      <EliminarPreregistroDialog
        open={eliminarOpen}
        onClose={() => setEliminarOpen(false)}
        activoId={activo.id}
        nombre={activo.nombre}
        onDelete={async (activoId) => {
          const result = await deleteActivoPreregistrado(activoId);
          if (result.error) {
            pushToast(result.error, "error");
          }
          return result;
        }}
        onSuccess={() => {
          pushToast(mensajeEliminacionPreregistros(1), "success");
          onActivoEliminado?.(activo.id);
          onClose();
          onActivoDeleted?.();
        }}
      />

      <RecuperarActivoDialog
        open={recuperarOpen}
        onClose={() => setRecuperarOpen(false)}
        activoId={activo.id}
        nombre={activo.nombre}
        tieneCodigoBarras={Boolean(activo.codigo_barras?.trim())}
        onSuccess={() => void refreshActivo()}
      />

      <CambiarAmbienteDialog
        open={cambiarAmbienteOpen}
        onClose={() => setCambiarAmbienteOpen(false)}
        activo={activo}
        onSuccess={() => void refreshActivo()}
      />

      <AgregarBienesSimilaresDialog
        open={similaresOpen}
        onClose={() => setSimilaresOpen(false)}
        activoId={activo.id}
        entidadId={entidadId}
        sedeId={activo.sede_id ?? ""}
        ambienteId={activo.ambiente_id ?? ""}
        sedeNombre={activo.sede_nombre}
        ambienteNombre={activo.ambiente_nombre}
        codigoCatalogo={activo.codigo_catalogo}
        nombre={activo.nombre}
        esRegistrado={!esPreregistrado}
        onAbrirAmbienteDestino={(destino) => {
          onClose();
          onAbrirAmbienteDestino?.(destino);
        }}
        onSuccess={(info) => {
          if (!info.ambienteDestinoId) void refreshActivo();
        }}
      />

    </>
  );
}
