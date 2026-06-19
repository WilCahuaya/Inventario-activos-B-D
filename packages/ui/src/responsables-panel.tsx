"use client";

import { useMemo, useState } from "react";
import type {
  CreateResponsableInput,
  ResponsableConConteo,
  UpdateResponsableInput,
} from "@inventario/types";
import { RESPONSABLE_CARGO_DEFAULT } from "@inventario/types";
import { Button, Dialog, Input, Label } from "./components";
import { ConfirmDialog } from "./confirm-dialog";
import {
  ActivateIcon,
  DeleteIcon,
  EditIcon,
  PanelCountLabel,
  PanelEmptyState,
  PanelFlashMessage,
  PanelIconAction,
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
  RESPONSABLES_TABLE_COLS,
  panelTableNowrapCellClass,
  panelTableShrinkCellClass,
} from "./panel-table-layout";

export interface ResponsablesPanelProps {
  /** @deprecated El contexto de entidad se muestra en el banner de la página padre. */
  entidadNombre?: string;
  responsables: ResponsableConConteo[];
  onCreate: (
    input: CreateResponsableInput,
  ) => Promise<{ data?: ResponsableConConteo; error?: string }>;
  onUpdate: (
    id: string,
    input: UpdateResponsableInput,
  ) => Promise<{ error?: string }>;
  onSetActivo: (id: string, activo: boolean) => Promise<{ error?: string }>;
  onDelete?: (id: string) => Promise<{ error?: string }>;
  onReload?: () => void | Promise<void>;
}

function cargoDisplay(responsable?: ResponsableConConteo): string {
  if (responsable?.es_administrador) {
    return responsable.cargo ?? "Administrador";
  }
  return responsable?.cargo ?? RESPONSABLE_CARGO_DEFAULT;
}

function ResponsableFormFields({
  responsable,
  idPrefix,
}: {
  responsable?: ResponsableConConteo;
  idPrefix: string;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}_nombre`}>Nombre completo</Label>
        <Input
          id={`${idPrefix}_nombre`}
          name="nombre"
          required
          placeholder="Ej. Juan Pérez García"
          defaultValue={responsable?.nombre ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}_dni`}>DNI</Label>
        <Input
          id={`${idPrefix}_dni`}
          name="dni"
          required
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          pattern="[0-9]{8}"
          title="8 dígitos"
          placeholder="12345678"
          defaultValue={responsable?.dni ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}_cargo`}>Cargo</Label>
        <Input
          id={`${idPrefix}_cargo`}
          value={cargoDisplay(responsable)}
          readOnly
          disabled
          className="bg-muted/50"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}_email`}>Correo</Label>
        <Input
          id={`${idPrefix}_email`}
          name="email"
          type="email"
          placeholder="Opcional"
          defaultValue={responsable?.email ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}_telefono`}>Teléfono</Label>
        <Input
          id={`${idPrefix}_telefono`}
          name="telefono"
          placeholder="Opcional"
          defaultValue={responsable?.telefono ?? ""}
        />
      </div>
    </>
  );
}

function responsableFromForm(form: FormData): CreateResponsableInput {
  return {
    nombre: String(form.get("nombre") || ""),
    dni: String(form.get("dni") || ""),
    email: String(form.get("email") || ""),
    telefono: String(form.get("telefono") || ""),
  };
}

function formatOptional(value: string | null | undefined): string {
  return value?.trim() ? value.trim() : "—";
}

function formatAmbientes(item: ResponsableConConteo): string {
  if (item.ambiente_nombres && item.ambiente_nombres.length > 0) {
    return item.ambiente_nombres.join(", ");
  }
  if (item.ambiente_count > 0) return `${item.ambiente_count}`;
  return "—";
}

type ResponsableConfirmAction =
  | { type: "deactivate"; item: ResponsableConConteo }
  | { type: "delete"; item: ResponsableConConteo };

export function ResponsablesPanel({
  responsables,
  onCreate,
  onUpdate,
  onSetActivo,
  onDelete,
  onReload,
}: ResponsablesPanelProps) {
  const [busqueda, setBusqueda] = useState("");
  const [ocultarInactivos, setOcultarInactivos] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ResponsableConConteo | null>(null);
  const [confirmAction, setConfirmAction] = useState<ResponsableConfirmAction | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    let list = responsables;
    if (ocultarInactivos) list = list.filter((r) => r.activo);
    const q = busqueda.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.nombre.toLowerCase().includes(q) ||
        (r.dni?.includes(q) ?? false) ||
        (r.email?.toLowerCase().includes(q) ?? false) ||
        (r.cargo?.toLowerCase().includes(q) ?? false) ||
        (r.telefono?.toLowerCase().includes(q) ?? false),
    );
  }, [responsables, busqueda, ocultarInactivos]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    const result = await onCreate(responsableFromForm(new FormData(e.currentTarget)));
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setMessage(`Responsable «${result.data?.nombre}» registrado.`);
    setCreateOpen(false);
    await onReload?.();
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editTarget) return;
    setPending(true);
    setError(null);
    setMessage(null);
    const result = await onUpdate(editTarget.id, responsableFromForm(new FormData(e.currentTarget)));
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setMessage("Responsable actualizado.");
    setEditTarget(null);
    await onReload?.();
  }

  async function handleActivate(item: ResponsableConConteo) {
    setPending(true);
    setError(null);
    setMessage(null);
    const result = await onSetActivo(item.id, true);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setMessage(`Responsable «${item.nombre}» reactivado.`);
    await onReload?.();
  }

  async function handleConfirmAction() {
    if (!confirmAction) return;

    setPending(true);
    setConfirmError(null);
    setError(null);
    setMessage(null);

    if (confirmAction.type === "deactivate") {
      const result = await onSetActivo(confirmAction.item.id, false);
      setPending(false);
      if (result.error) {
        setConfirmError(result.error);
        return;
      }
      setMessage("Responsable desactivado.");
      setConfirmAction(null);
      await onReload?.();
      return;
    }

    if (!onDelete) {
      setPending(false);
      setConfirmAction(null);
      return;
    }

    const result = await onDelete(confirmAction.item.id);
    setPending(false);
    if (result.error) {
      setConfirmError(result.error);
      return;
    }
    setMessage("Responsable eliminado.");
    setConfirmAction(null);
    await onReload?.();
  }

  const confirmTitle =
    confirmAction?.type === "delete" ? "Eliminar responsable" : "Desactivar responsable";

  const confirmDescription = confirmAction
    ? confirmAction.type === "delete"
      ? `¿Eliminar definitivamente a «${confirmAction.item.nombre}»? Esta acción no se puede deshacer.`
      : `¿Desactivar a «${confirmAction.item.nombre}»? Podrá reactivarlo o eliminarlo después desde «Mostrar inactivos».`
    : undefined;

  return (
    <div className="space-y-4">
      <PanelToolbar
        left={
          <PanelCountLabel
            count={filtrados.length}
            singular="responsable"
            plural="responsables"
          />
        }
        right={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <div className="min-w-[200px] flex-1 sm:max-w-xs sm:flex-none">
              <PanelSearchInput
                value={busqueda}
                onChange={setBusqueda}
                placeholder="Buscar por nombre, DNI, correo o teléfono…"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOcultarInactivos((v) => !v)}
            >
              {ocultarInactivos ? "Mostrar inactivos" : "Ocultar inactivos"}
            </Button>
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              + Agregar responsable
            </Button>
          </div>
        }
      />

      {message && <PanelFlashMessage variant="success">{message}</PanelFlashMessage>}
      {error && <PanelFlashMessage variant="error">{error}</PanelFlashMessage>}

      {filtrados.length === 0 ? (
        <PanelEmptyState
          message={
            responsables.length === 0
              ? "Aún no hay responsables registrados para esta entidad."
              : "No hay responsables que coincidan con la búsqueda."
          }
          action={
            responsables.length === 0 ? (
              <Button type="button" onClick={() => setCreateOpen(true)}>
                + Agregar primer responsable
              </Button>
            ) : undefined
          }
        />
      ) : (
        <PanelDataTable layout="auto">
          <PanelTableColgroup cols={RESPONSABLES_TABLE_COLS} />
          <thead className={panelTableStickyHeadClass}>
            <tr className={panelTableHeadRowClass}>
              <PanelTableTh>Nombre</PanelTableTh>
              <PanelTableTh className={panelTableShrinkCellClass}>DNI</PanelTableTh>
              <PanelTableTh className={panelTableShrinkCellClass}>Cargo</PanelTableTh>
              <PanelTableTh>Correo</PanelTableTh>
              <PanelTableTh className={panelTableShrinkCellClass}>Teléfono</PanelTableTh>
              <PanelTableTh>Ambientes a cargo</PanelTableTh>
              <PanelTableTh className={panelTableNowrapCellClass}>Estado</PanelTableTh>
              <PanelTableTh align="right" className={panelTableNowrapCellClass}>
                Acciones
              </PanelTableTh>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((item) => (
              <tr key={item.id} className={panelTableBodyRowClass}>
                <PanelTableTd className="font-medium" title={item.nombre}>
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="truncate">{item.nombre}</span>
                    {item.es_administrador && (
                      <StatusBadge variant="pending">Administrador</StatusBadge>
                    )}
                  </span>
                </PanelTableTd>
                <PanelTableTd
                  className={`${panelTableMutedClass} ${panelTableShrinkCellClass} font-mono tabular-nums`}
                  title={item.dni ?? undefined}
                >
                  {formatOptional(item.dni)}
                </PanelTableTd>
                <PanelTableTd
                  className={`${panelTableMutedClass} ${panelTableShrinkCellClass}`}
                  title={item.cargo ?? undefined}
                >
                  {item.cargo ?? "—"}
                </PanelTableTd>
                <PanelTableTd
                  className={panelTableMutedClass}
                  title={item.email ?? undefined}
                >
                  {formatOptional(item.email)}
                </PanelTableTd>
                <PanelTableTd
                  className={`${panelTableMutedClass} ${panelTableShrinkCellClass}`}
                  title={item.telefono ?? undefined}
                >
                  {formatOptional(item.telefono)}
                </PanelTableTd>
                <PanelTableTd className={panelTableMutedClass} title={formatAmbientes(item)}>
                  {formatAmbientes(item)}
                </PanelTableTd>
                <PanelTableTd className={panelTableNowrapCellClass}>
                  <StatusBadge variant={item.activo ? "active" : "default"}>
                    {item.activo ? "Activo" : "Inactivo"}
                  </StatusBadge>
                </PanelTableTd>
                <PanelTableTd
                  align="right"
                  className={`overflow-visible ${panelTableNowrapCellClass}`}
                >
                  <div className="flex flex-nowrap items-center justify-end gap-1">
                    <PanelIconAction
                      label="Editar"
                      disabled={pending}
                      onClick={() => setEditTarget(item)}
                    >
                      <EditIcon />
                    </PanelIconAction>
                    {!item.es_administrador && (
                      <>
                        {!item.activo && (
                          <PanelIconAction
                            label="Activar"
                            variant="success"
                            disabled={pending}
                            onClick={() => void handleActivate(item)}
                          >
                            <ActivateIcon />
                          </PanelIconAction>
                        )}
                        <PanelIconAction
                          label={item.activo ? "Desactivar" : "Eliminar definitivamente"}
                          variant="danger"
                          disabled={pending}
                          onClick={() =>
                            setConfirmAction(
                              item.activo
                                ? { type: "deactivate", item }
                                : { type: "delete", item },
                            )
                          }
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

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo responsable">
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => void handleCreate(e)}>
          <div className="sm:col-span-2">
            <ResponsableFormFields idPrefix="new_resp" />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title="Editar responsable"
      >
        {editTarget && (
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => void handleEdit(e)}>
            {editTarget.es_administrador && (
              <p className="sm:col-span-2 text-xs text-muted-foreground">
                Este responsable es el administrador de la entidad. Los datos principales se
                actualizan al editar la entidad; aquí puede ajustar el contacto.
              </p>
            )}
            <div className="sm:col-span-2">
              <ResponsableFormFields idPrefix="edit_resp" responsable={editTarget} />
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        onClose={() => {
          setConfirmAction(null);
          setConfirmError(null);
        }}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={
          confirmAction?.type === "delete" ? "Eliminar definitivamente" : "Desactivar"
        }
        confirmVariant={confirmAction?.type === "delete" ? "destructive" : "default"}
        pending={pending}
        error={confirmError}
        onConfirm={() => void handleConfirmAction()}
      />
    </div>
  );
}
