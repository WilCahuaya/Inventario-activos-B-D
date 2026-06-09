"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Activo, Entidad, EstadoRegistro } from "@inventario/types";
import { Button, Dialog } from "@inventario/ui";
import { listAmbientes, listSedes } from "@/lib/actions/ubicacion";
import type { Ambiente, Sede } from "@inventario/types";
import { ActivoForm } from "./ActivoForm";
import { ActivosInventarioExcelView } from "./ActivosInventarioExcelView";
import { InventarioExportButtons } from "./InventarioExportButtons";
import { PanelCountLabel, PanelSearchInput, panelModalClass } from "./panel-ui";

interface InventarioItem extends Activo {
  entidad_nombre?: string;
  sede_nombre?: string;
  ambiente_nombre?: string;
}

interface InventarioGlobalPanelProps {
  entidades: Entidad[];
  activos: InventarioItem[];
  initialEstado?: EstadoRegistro | "";
}

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

const FILTROS_ESTADO: { value: "" | EstadoRegistro; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "REGISTRADO", label: "Registrados" },
  { value: "PREREGISTRADO", label: "Preregistrados" },
  { value: "DADO_DE_BAJA", label: "Dados de baja" },
];

export function InventarioGlobalPanel({
  entidades,
  activos,
  initialEstado = "",
}: InventarioGlobalPanelProps) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [entidadId, setEntidadId] = useState("");
  const [sedeId, setSedeId] = useState("");
  const [ambienteId, setAmbienteId] = useState("");
  const [estadoRegistro, setEstadoRegistro] = useState<"" | EstadoRegistro>(initialEstado);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [editActivo, setEditActivo] = useState<InventarioItem | null>(null);

  async function handleEntidadChange(value: string) {
    setEntidadId(value);
    setSedeId("");
    setAmbienteId("");
    setAmbientes([]);
    if (!value) {
      setSedes([]);
      return;
    }
    const data = await listSedes(value);
    setSedes(data);
  }

  async function handleSedeChange(value: string) {
    setSedeId(value);
    setAmbienteId("");
    if (!value) {
      setAmbientes([]);
      return;
    }
    const data = await listAmbientes(value);
    setAmbientes(data);
  }

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return activos.filter((a) => {
      if (entidadId && a.entidad_id !== entidadId) return false;
      if (sedeId && a.sede_id !== sedeId) return false;
      if (ambienteId && a.ambiente_id !== ambienteId) return false;
      if (estadoRegistro && a.estado_registro !== estadoRegistro) return false;
      if (!q) return true;
      return (
        a.nombre.toLowerCase().includes(q) ||
        (a.codigo_barras?.toLowerCase().includes(q) ?? false) ||
        a.codigo_catalogo.toLowerCase().includes(q) ||
        (a.entidad_nombre?.toLowerCase().includes(q) ?? false) ||
        (a.sede_nombre?.toLowerCase().includes(q) ?? false) ||
        (a.ambiente_nombre?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [activos, busqueda, entidadId, sedeId, ambienteId, estadoRegistro]);

  function handleSuccess() {
    setEditActivo(null);
    router.refresh();
  }

  function limpiarFiltros() {
    setEntidadId("");
    setSedeId("");
    setAmbienteId("");
    setEstadoRegistro("");
    setSedes([]);
    setAmbientes([]);
    setBusqueda("");
  }

  return (
    <>
    <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <PanelCountLabel count={filtrados.length} singular="activo" plural="activos" />
          </div>
          <InventarioExportButtons
            activos={filtrados}
            meta={{ ambienteNombre: "Inventario global", entidadNombre: "Todas las entidades" }}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTROS_ESTADO.map((f) => (
            <Button
              key={f.value || "all"}
              type="button"
              size="sm"
              variant={estadoRegistro === f.value ? "default" : "outline"}
              onClick={() => setEstadoRegistro(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Entidad</label>
            <select
              className={selectClass}
              value={entidadId}
              onChange={(e) => void handleEntidadChange(e.target.value)}
            >
              <option value="">Todas</option>
              {entidades.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Sede</label>
            <select
              className={selectClass}
              value={sedeId}
              disabled={!entidadId}
              onChange={(e) => void handleSedeChange(e.target.value)}
            >
              <option value="">Todas</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Ambiente</label>
            <select
              className={selectClass}
              value={ambienteId}
              disabled={!sedeId}
              onChange={(e) => setAmbienteId(e.target.value)}
            >
              <option value="">Todos</option>
              {ambientes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-1">
            <Button type="button" variant="outline" className="w-full" onClick={limpiarFiltros}>
              Limpiar filtros
            </Button>
          </div>
        </div>

        <PanelSearchInput
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar por código, nombre, entidad, sede o ambiente…"
        />

        <ActivosInventarioExcelView
          activos={filtrados}
          onEditActivo={setEditActivo}
          puedeDarDeBaja
          puedeValidarPreregistro
        />
    </div>

      <Dialog
        open={!!editActivo}
        onClose={() => setEditActivo(null)}
        title="Editar activo"
        className={panelModalClass}
      >
        {editActivo && (
          <ActivoForm
            entidades={entidades}
            fixedEntidadId={editActivo.entidad_id}
            fixedSedeId={editActivo.sede_id ?? undefined}
            fixedAmbienteId={editActivo.ambiente_id ?? undefined}
            activo={editActivo}
            mode="edit"
            submitLabel="Guardar cambios"
            asignaCodigoInmediato={editActivo.estado_registro !== "PREREGISTRADO"}
            variant="modal"
            onSuccess={handleSuccess}
          />
        )}
      </Dialog>
    </>
  );
}
