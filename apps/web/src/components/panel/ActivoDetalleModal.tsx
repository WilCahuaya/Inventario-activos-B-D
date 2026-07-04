"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Activo } from "@inventario/types";
import { formatEjemplaresEnAmbienteTexto } from "@inventario/types";
import { ActivoDetalleSheet, type ActivoDetalle } from "@inventario/ui/panel";
import { listHistorialActivo, type HistorialConUsuario } from "@/lib/actions/historial";
import { getEjemplaresSimilaresResumen } from "@/lib/actions/activos";
import { FotoPreviewDialog, PdfPreviewDialog } from "./ActivoMediaDialogs";
import { CambiarAmbienteDialog } from "./CambiarAmbienteDialog";
import { DarDeBajaDialog } from "./DarDeBajaDialog";
import { RecuperarActivoDialog } from "./RecuperarActivoDialog";
import { ValidarPreregistroDialog } from "./ValidarPreregistroDialog";
import { AgregarBienesSimilaresDialog } from "./AgregarBienesSimilaresDialog";
import {
  ActivoIconButton,
  IconAmbiente,
  IconEditar,
  IconInactivo,
  IconRecuperar,
  IconSimilares,
  IconValidar,
} from "./activo-icons";

function formatHistorialFecha(iso: string) {
  return new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HistorialSection({
  loading,
  historial,
}: {
  loading: boolean;
  historial: HistorialConUsuario[];
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="border-b border-border/50 bg-muted/20 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-foreground">Historial de cambios</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Últimas modificaciones del bien</p>
      </div>
      <div className="p-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando historial…</p>
        ) : historial.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin cambios registrados.</p>
        ) : (
          <ul className="max-h-52 space-y-2 overflow-y-auto">
            {historial.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-border/50 bg-muted/10 px-3 py-2.5"
              >
                <p className="text-sm font-medium text-foreground">
                  {item.accion}
                  {item.campo ? (
                    <span className="font-normal text-muted-foreground"> · {item.campo}</span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatHistorialFecha(item.created_at)}
                  {item.usuario_nombre ? ` · ${item.usuario_nombre}` : ""}
                </p>
                {(item.valor_anterior || item.valor_nuevo) && (
                  <p className="mt-1.5 rounded-md bg-background/80 px-2 py-1 font-mono text-[11px] text-foreground/90">
                    {item.valor_anterior ? `${item.valor_anterior} → ` : ""}
                    {item.valor_nuevo ?? "—"}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

interface ActivoDetalleModalProps {
  activo: ActivoDetalle;
  open: boolean;
  onClose: () => void;
  onEdit?: (activo: Activo) => void;
  onIrAmbiente?: (activo: Activo) => void;
  puedeDarDeBaja?: boolean;
  puedeValidarPreregistro?: boolean;
  editarLabel?: string;
  soloUbicacion?: boolean;
  asignaCodigoInmediato?: boolean;
}

export function ActivoDetalleModal({
  activo,
  open,
  onClose,
  onEdit,
  onIrAmbiente,
  puedeDarDeBaja = true,
  puedeValidarPreregistro = false,
  editarLabel = "Editar activo",
  soloUbicacion = false,
  asignaCodigoInmediato = true,
}: ActivoDetalleModalProps) {
  const router = useRouter();
  const [fotoOpen, setFotoOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [bajaOpen, setBajaOpen] = useState(false);
  const [recuperarOpen, setRecuperarOpen] = useState(false);
  const [validarOpen, setValidarOpen] = useState(false);
  const [cambiarAmbienteOpen, setCambiarAmbienteOpen] = useState(false);
  const [similaresOpen, setSimilaresOpen] = useState(false);
  const [ejemplaresLoading, setEjemplaresLoading] = useState(false);
  const [ejemplares, setEjemplares] = useState<{
    total: number;
    registrados: number;
    preregistrados: number;
  } | null>(null);
  const [historial, setHistorial] = useState<HistorialConUsuario[]>([]);
  const [historialLoading, setHistorialLoading] = useState(false);

  const esPreregistrado = activo.estado_registro === "PREREGISTRADO";
  const inactivo = activo.estado_registro === "DADO_DE_BAJA";

  const reloadEjemplares = useCallback(() => {
    setEjemplaresLoading(true);
    void getEjemplaresSimilaresResumen(activo.id)
      .then(setEjemplares)
      .finally(() => setEjemplaresLoading(false));
  }, [activo.id]);

  useEffect(() => {
    if (!open) return;
    reloadEjemplares();
    setHistorialLoading(true);
    void listHistorialActivo(activo.id)
      .then(setHistorial)
      .finally(() => setHistorialLoading(false));
  }, [open, activo.id, reloadEjemplares]);

  function handleRefresh() {
    router.refresh();
    reloadEjemplares();
    setHistorialLoading(true);
    void listHistorialActivo(activo.id)
      .then(setHistorial)
      .finally(() => setHistorialLoading(false));
  }

  const banner = (
    <>
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
      {puedeValidarPreregistro && esPreregistrado && (
        <ActivoIconButton
          label="Validar preregistro"
          variant="primary"
          onClick={() => setValidarOpen(true)}
        >
          <IconValidar />
        </ActivoIconButton>
      )}
      {!inactivo && onEdit && (
        <ActivoIconButton
          label={editarLabel}
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
        <ActivoIconButton label="Agregar similares" onClick={() => setSimilaresOpen(true)}>
          <IconSimilares />
        </ActivoIconButton>
      )}
      {!inactivo && (
        <ActivoIconButton label="Cambiar ambiente" onClick={() => setCambiarAmbienteOpen(true)}>
          <IconAmbiente />
        </ActivoIconButton>
      )}
      {!inactivo && puedeDarDeBaja && (
        <ActivoIconButton label="Dar de baja" variant="danger" onClick={() => setBajaOpen(true)}>
          <IconInactivo />
        </ActivoIconButton>
      )}
      {inactivo && puedeDarDeBaja && (
        <ActivoIconButton
          label="Recuperar activo"
          variant="primary"
          onClick={() => setRecuperarOpen(true)}
        >
          <IconRecuperar />
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
        extraSections={<HistorialSection loading={historialLoading} historial={historial} />}
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

      <DarDeBajaDialog
        open={bajaOpen}
        onClose={() => setBajaOpen(false)}
        activoId={activo.id}
        nombre={activo.nombre}
        onSuccess={handleRefresh}
      />

      <RecuperarActivoDialog
        open={recuperarOpen}
        onClose={() => setRecuperarOpen(false)}
        activoId={activo.id}
        nombre={activo.nombre}
        tieneCodigoBarras={Boolean(activo.codigo_barras?.trim())}
        onSuccess={handleRefresh}
      />

      <CambiarAmbienteDialog
        open={cambiarAmbienteOpen}
        onClose={() => setCambiarAmbienteOpen(false)}
        activo={activo}
        onSuccess={handleRefresh}
      />

      <AgregarBienesSimilaresDialog
        open={similaresOpen}
        onClose={() => setSimilaresOpen(false)}
        activoId={activo.id}
        entidadId={activo.entidad_id}
        sedeId={activo.sede_id ?? ""}
        ambienteId={activo.ambiente_id ?? ""}
        sedeNombre={activo.sede_nombre}
        ambienteNombre={activo.ambiente_nombre}
        codigoCatalogo={activo.codigo_catalogo}
        nombre={activo.nombre}
        esRegistrado={!esPreregistrado}
        onSuccess={(info) => {
          if (info.ambienteDestinoId) {
            onClose();
          } else {
            handleRefresh();
          }
        }}
      />

      {puedeValidarPreregistro && esPreregistrado && (
        <ValidarPreregistroDialog
          open={validarOpen}
          onClose={() => setValidarOpen(false)}
          entidadId={activo.entidad_id}
          activoId={activo.id}
          nombre={activo.nombre}
          codigoCatalogo={activo.codigo_catalogo}
          posibleAmbienteId={activo.posible_ambiente_id}
          posibleAmbienteNombre={activo.posible_ambiente_nombre}
          onSuccess={handleRefresh}
        />
      )}
    </>
  );
}
