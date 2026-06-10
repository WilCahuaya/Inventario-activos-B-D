import { useEffect, useMemo, useState } from "react";
import { Button, Input, Label } from "@inventario/ui";
import {
  PanelCountLabel,
  PanelEmptyState,
  PanelSearchInput,
  StatusBadge,
  panelCardClass,
} from "@inventario/ui/panel";
import { inviteContador, listUsuarios, type ProfileConEntidad } from "../lib/usuarios";

function rolLabel(rol: string) {
  if (rol === "CONTADOR") return "Contador";
  if (rol === "ADMIN_ENTIDAD") return "Administrador";
  return rol;
}

export function UsuariosView() {
  const [usuarios, setUsuarios] = useState<ProfileConEntidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  async function reloadUsuarios() {
    const result = await listUsuarios();
    if (result.error) {
      setError(result.error);
      return;
    }
    setUsuarios(result.data ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void listUsuarios().then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setUsuarios(result.data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
    setInviteError(null);

    const result = await inviteContador({ nombre, email });
    setPending(false);

    if (result.error) {
      setInviteError(result.error);
      return;
    }

    setMessage(result.message ?? "Contador agregado correctamente.");
    setNombre("");
    setEmail("");
    setShowInvite(false);
    await reloadUsuarios();
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Usuarios del sistema</h2>
        <p className="text-sm text-muted-foreground">
          Gestione contadores del estudio e invíte administradores al crear una entidad.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

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
        {inviteError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {inviteError}
          </p>
        )}
      </div>

      <PanelCountLabel count={filtrados.length} singular="usuario" plural="usuarios" />

      <PanelSearchInput
        value={busqueda}
        onChange={setBusqueda}
        placeholder="Buscar por nombre, correo, rol o entidad…"
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando usuarios…</p>
      ) : filtrados.length === 0 ? (
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
