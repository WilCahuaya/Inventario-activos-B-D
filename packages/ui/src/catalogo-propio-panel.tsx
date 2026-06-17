"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CatalogoNacional, CatalogoCampoOpciones, CatalogoOpcionTipo, UpdateCatalogoPropioInput } from "@inventario/types";
import {
  CATALOGO_CUENTA_ORDEN_CONTABILIDAD,
  CATALOGO_ORIGEN_LABELS,
} from "@inventario/types";
import { Button, Dialog, Input, Label } from "./components";
import { ClaseCatalogoCombobox } from "./clase-catalogo-combobox";
import { GrupoCatalogoCombobox } from "./grupo-catalogo-combobox";
import { ConfirmDialog } from "./confirm-dialog";
import {
  DeleteIcon,
  PanelIconAction,
  ViewIcon,
} from "./panel-action-buttons";
import {
  EditIcon,
  PanelCountLabel,
  PanelEmptyState,
  PanelFlashMessage,
  PanelSearchInput,
  PanelToolbar,
  StatusBadge,
} from "./panel";
import {
  PanelDataTable,
  panelTableBodyRowClass,
  panelTableHeadRowClass,
  panelTableMutedClass,
  panelTableStickyHeadClass,
} from "./panel-list-table";
import {
  PanelTableColgroup,
  PanelTableTd,
  PanelTableTh,
  panelTableNowrapCellClass,
} from "./panel-table-layout";

const CATALOGO_PROPIO_TABLE_COLS = [
  { type: "shrink" as const },
  { type: "grow" as const },
  { type: "grow" as const },
  { type: "shrink" as const },
  { type: "shrink" as const },
];

const OPCIONES_VACIAS: CatalogoCampoOpciones = { opciones: [], personalizadas: [] };

export interface CatalogoPropioPanelProps {
  listItems: () => Promise<CatalogoNacional[]>;
  loadGrupos: () => Promise<CatalogoCampoOpciones>;
  loadClases: () => Promise<CatalogoCampoOpciones>;
  onRegisterOpcionPersonalizada?: (
    tipo: CatalogoOpcionTipo,
    valor: string,
  ) => Promise<{ error?: string } | void>;
  onDeleteOpcionPersonalizada?: (
    tipo: CatalogoOpcionTipo,
    valor: string,
  ) => Promise<{ error?: string } | void>;
  onUpdate: (
    codigo: string,
    input: UpdateCatalogoPropioInput,
  ) => Promise<{ data?: CatalogoNacional; error?: string }>;
  onDelete: (codigo: string) => Promise<{ error?: string }>;
  reloadKey?: number;
  readOnly?: boolean;
  onAddNew?: () => void;
}

function CatalogoDetalleView({ item }: { item: CatalogoNacional }) {
  const rows: Array<{ label: string; value: string | null | undefined }> = [
    { label: "Código", value: item.codigo },
    { label: "Denominación", value: item.denominacion },
    { label: "Grupo", value: item.grupo },
    { label: "Clase", value: item.clase },
    { label: "Contabilidad", value: item.contabilidad },
    { label: "Estado", value: item.estado },
    { label: "Origen", value: CATALOGO_ORIGEN_LABELS.PROPIO },
  ];

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="space-y-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {row.label}
          </dt>
          <dd className="text-sm text-foreground">{row.value?.trim() || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function CatalogoPropioPanel({
  listItems,
  loadGrupos,
  loadClases,
  onRegisterOpcionPersonalizada,
  onDeleteOpcionPersonalizada,
  onUpdate,
  onDelete,
  reloadKey = 0,
  readOnly = false,
  onAddNew,
}: CatalogoPropioPanelProps) {
  const [items, setItems] = useState<CatalogoNacional[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [viewTarget, setViewTarget] = useState<CatalogoNacional | null>(null);
  const [editTarget, setEditTarget] = useState<CatalogoNacional | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogoNacional | null>(null);
  const [grupos, setGrupos] = useState<CatalogoCampoOpciones>(OPCIONES_VACIAS);
  const [clases, setClases] = useState<CatalogoCampoOpciones>(OPCIONES_VACIAS);
  const [editDenominacion, setEditDenominacion] = useState("");
  const [editGrupo, setEditGrupo] = useState("");
  const [editClase, setEditClase] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lista, listaGrupos, listaClases] = await Promise.all([
        listItems(),
        loadGrupos(),
        loadClases(),
      ]);
      setItems(lista);
      setGrupos(listaGrupos);
      setClases(listaClases);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el catálogo propio.");
    } finally {
      setLoading(false);
    }
  }, [listItems, loadGrupos, loadClases]);

  useEffect(() => {
    void reload();
  }, [reload, reloadKey]);

  async function refreshOpciones() {
    const [listaGrupos, listaClases] = await Promise.all([loadGrupos(), loadClases()]);
    setGrupos(listaGrupos);
    setClases(listaClases);
  }

  async function handleRegister(tipo: CatalogoOpcionTipo, valor: string) {
    await onRegisterOpcionPersonalizada?.(tipo, valor);
    await refreshOpciones();
  }

  async function handleDeleteOpcion(tipo: CatalogoOpcionTipo, valor: string) {
    const result = await onDeleteOpcionPersonalizada?.(tipo, valor);
    await refreshOpciones();
    return result;
  }

  const gruposEdit = useMemo(() => {
    const merged = new Set(grupos.opciones);
    if (editGrupo) merged.add(editGrupo);
    return [...merged].sort((a, b) => a.localeCompare(b, "es"));
  }, [grupos.opciones, editGrupo]);

  const clasesEdit = useMemo(() => {
    const merged = new Set(clases.opciones);
    if (editClase) merged.add(editClase);
    return [...merged].sort((a, b) => a.localeCompare(b, "es"));
  }, [clases.opciones, editClase]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.codigo.toLowerCase().includes(q) ||
        item.denominacion.toLowerCase().includes(q) ||
        (item.grupo?.toLowerCase().includes(q) ?? false),
    );
  }, [busqueda, items]);

  function openEdit(item: CatalogoNacional) {
    setEditTarget(item);
    setEditDenominacion(item.denominacion);
    setEditGrupo(item.grupo ?? "");
    setEditClase(item.clase ?? "");
    setError(null);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setPending(true);
    setError(null);
    setMessage(null);
    const result = await onUpdate(editTarget.codigo, {
      denominacion: editDenominacion,
      grupo: editGrupo,
      clase: editClase,
    });
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setMessage(`Ítem ${editTarget.codigo} actualizado.`);
    setEditTarget(null);
    await reload();
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setPending(true);
    setConfirmError(null);
    const result = await onDelete(deleteTarget.codigo);
    setPending(false);
    if (result.error) {
      setConfirmError(result.error);
      return;
    }
    setMessage(`Ítem ${deleteTarget.codigo} eliminado.`);
    setDeleteTarget(null);
    await reload();
  }

  return (
    <div className="space-y-4">
      <PanelToolbar
        left={
          <PanelCountLabel
            count={filtrados.length}
            singular="ítem propio"
            plural="ítems propios"
          />
        }
        right={
          <div className="min-w-[200px] flex-1 sm:max-w-xs sm:flex-none">
            <PanelSearchInput
              value={busqueda}
              onChange={setBusqueda}
              placeholder="Buscar código, nombre o grupo…"
            />
          </div>
        }
      />

      {message && <PanelFlashMessage variant="success">{message}</PanelFlashMessage>}
      {error && !editTarget && !deleteTarget && (
        <PanelFlashMessage variant="error">{error}</PanelFlashMessage>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando catálogo propio…</p>
      ) : filtrados.length === 0 ? (
        <PanelEmptyState
          message={
            items.length === 0
              ? "Aún no hay ítems en el catálogo propio."
              : "No hay ítems que coincidan con la búsqueda."
          }
          action={
            items.length === 0 && onAddNew ? (
              <Button type="button" onClick={onAddNew}>
                + Agregar primer ítem
              </Button>
            ) : undefined
          }
        />
      ) : (
        <PanelDataTable layout="auto">
          <PanelTableColgroup cols={CATALOGO_PROPIO_TABLE_COLS} />
          <thead className={panelTableStickyHeadClass}>
            <tr className={panelTableHeadRowClass}>
              <PanelTableTh className={panelTableNowrapCellClass}>Código</PanelTableTh>
              <PanelTableTh>Denominación</PanelTableTh>
              <PanelTableTh>Grupo</PanelTableTh>
              <PanelTableTh className={panelTableNowrapCellClass}>Estado</PanelTableTh>
              <PanelTableTh align="right" className={panelTableNowrapCellClass}>
                {readOnly ? "Ver" : "Acciones"}
              </PanelTableTh>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((item) => (
              <tr key={item.codigo} className={panelTableBodyRowClass}>
                <PanelTableTd className={`font-mono text-xs ${panelTableNowrapCellClass}`}>
                  {item.codigo}
                </PanelTableTd>
                <PanelTableTd className="font-medium" title={item.denominacion}>
                  {item.denominacion}
                </PanelTableTd>
                <PanelTableTd className={panelTableMutedClass} title={item.grupo ?? undefined}>
                  {item.grupo ?? "—"}
                </PanelTableTd>
                <PanelTableTd className={panelTableNowrapCellClass}>
                  <StatusBadge variant="default">{item.estado ?? "EXCLUIDO"}</StatusBadge>
                </PanelTableTd>
                <PanelTableTd align="right" className={panelTableNowrapCellClass}>
                  <div className="flex flex-nowrap items-center justify-end gap-1">
                    <PanelIconAction label="Ver" onClick={() => setViewTarget(item)}>
                      <ViewIcon />
                    </PanelIconAction>
                    {!readOnly && (
                      <>
                        <PanelIconAction label="Editar" onClick={() => openEdit(item)}>
                          <EditIcon />
                        </PanelIconAction>
                        <PanelIconAction
                          label="Eliminar"
                          variant="danger"
                          onClick={() => {
                            setConfirmError(null);
                            setDeleteTarget(item);
                          }}
                        >
                          <DeleteIcon />
                        </PanelIconAction>
                      </>
                    )}
                  </div>
                </PanelTableTd>
              </tr>
            ))}
          </tbody>
        </PanelDataTable>
      )}

      <Dialog
        open={Boolean(viewTarget)}
        onClose={() => setViewTarget(null)}
        title="Detalle del ítem propio"
      >
        {viewTarget && <CatalogoDetalleView item={viewTarget} />}
      </Dialog>

      <Dialog
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title="Editar ítem propio"
      >
        {editTarget && (
          <form className="space-y-4" onSubmit={(e) => void handleEditSubmit(e)}>
            <div className="space-y-2">
              <Label>Código</Label>
              <Input readOnly disabled value={editTarget.codigo} className="bg-muted font-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_denominacion">Denominación</Label>
              <Input
                id="edit_denominacion"
                required
                value={editDenominacion}
                disabled={pending}
                onChange={(e) => setEditDenominacion(e.target.value)}
              />
            </div>
            <GrupoCatalogoCombobox
              id="edit_grupo"
              value={editGrupo}
              grupos={gruposEdit}
              personalizadas={grupos.personalizadas}
              disabled={pending}
              onChange={setEditGrupo}
              onRegisterPersonalizada={(valor) => handleRegister("grupo", valor)}
              onDeletePersonalizada={(valor) => handleDeleteOpcion("grupo", valor)}
            />
            <ClaseCatalogoCombobox
              id="edit_clase"
              value={editClase}
              opciones={clasesEdit}
              personalizadas={clases.personalizadas}
              disabled={pending}
              onChange={setEditClase}
              onRegisterPersonalizada={(valor) => handleRegister("clase", valor)}
              onDeletePersonalizada={(valor) => handleDeleteOpcion("clase", valor)}
            />
            <div className="space-y-2">
              <Label>Contabilidad</Label>
              <Input
                readOnly
                disabled
                value={CATALOGO_CUENTA_ORDEN_CONTABILIDAD}
                className="bg-muted font-mono"
              />
            </div>
            {error && <PanelFlashMessage variant="error">{error}</PanelFlashMessage>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending || !editGrupo || !editClase}>
                {pending ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          setDeleteTarget(null);
          setConfirmError(null);
        }}
        title="Eliminar ítem del catálogo propio"
        description={
          deleteTarget
            ? `¿Eliminar definitivamente «${deleteTarget.denominacion}» (${deleteTarget.codigo})? Solo es posible si ningún activo lo usa.`
            : undefined
        }
        confirmLabel="Eliminar"
        confirmVariant="destructive"
        pending={pending}
        error={confirmError}
        onConfirm={() => void handleDeleteConfirm()}
      />
    </div>
  );
}
