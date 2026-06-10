"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@inventario/ui";
import { inviteContador, type ProfileConEntidad } from "@/lib/actions/usuarios";
import {
  PanelCountLabel,
  PanelEmptyState,
  PanelSearchInput,
  StatusBadge,
  panelCardClass,
} from "./panel-ui";

interface UsuariosPanelProps {
  usuarios: ProfileConEntidad[];
}

function rolLabel(rol: string) {
  if (rol === "CONTADOR") return "Contador";
  if (rol === "ADMIN_ENTIDAD") return "Administrador";
  return rol;
}

export function UsuariosPanel({ usuarios }: UsuariosPanelProps) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const contadores = useMemo(
    () => usuarios.filter((u) => u.rol === "CONTADOR" && u.activo),
    [usuarios],
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter(
      (u) =>
        u.nombre.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.entidad_nombre?.toLowerCase().includes(q) ?? false) ||
        rolLabel(u.rol).toLowerCase().includes(q),
    );
  }, [usuarios, busqueda]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);

    const result = await inviteContador({ nombre, email });
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setMessage(result.message ?? "Contador agregado correctamente.");
    setNombre("");
    setEmail("");
    setShowInvite(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className={`${panelCardClass} space-y-4 p-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Contadores del estudio</h3>
            <p className="text-sm text-muted-foreground">
              {contadores.length === 1
                ? "1 contador activo. Puede invitar más compañeros del estudio."
                : `${contadores.length} contadores activos.`}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowInvite((v) => !v)}>
            {showInvite ? "Cancelar" : "Invitar contador"}
          </Button>
        </div>

        {showInvite && (
          <form onSubmit={(e) => void handleInvite(e)} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contador_nombre">Nombre</Label>
              <Input
                id="contador_nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre completo"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contador_email">Correo (Google)</Label>
              <Input
                id="contador_email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Enviando…" : "Enviar invitación"}
              </Button>
            </div>
          </form>
        )}

        {message && (
          <p className="rounded-lg border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-100">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <PanelCountLabel count={filtrados.length} singular="usuario" plural="usuarios" />

      <PanelSearchInput
        value={busqueda}
        onChange={setBusqueda}
        placeholder="Buscar por nombre, correo, rol o entidad…"
      />

      {filtrados.length === 0 ? (
        <PanelEmptyState message="No hay usuarios que coincidan con la búsqueda." />
      ) : (
        <div className={`${panelCardClass} overflow-x-auto`}>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Correo</th>
                <th className="px-4 py-3 font-semibold">Rol</th>
                <th className="px-4 py-3 font-semibold">Entidad</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((usuario) => (
                <tr key={usuario.id} className="border-b border-border/40 last:border-b-0">
                  <td className="px-4 py-3 font-medium text-foreground">{usuario.nombre}</td>
                  <td className="px-4 py-3 text-muted-foreground">{usuario.email}</td>
                  <td className="px-4 py-3">{rolLabel(usuario.rol)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{usuario.entidad_nombre ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge variant={usuario.activo ? "active" : "default"}>
                      {usuario.activo ? "Activo" : "Inactivo"}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
