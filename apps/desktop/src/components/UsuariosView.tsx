import { useEffect, useMemo, useState } from "react";
import {
  PanelCountLabel,
  PanelEmptyState,
  PanelSearchInput,
  StatusBadge,
  panelCardClass,
} from "@inventario/ui/panel";
import { listUsuarios, type ProfileConEntidad } from "../lib/usuarios";

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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Usuarios del sistema</h2>
        <p className="text-sm text-muted-foreground">
          Perfiles registrados con acceso al inventario (solo lectura).
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

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
