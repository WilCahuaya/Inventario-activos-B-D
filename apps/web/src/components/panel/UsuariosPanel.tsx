"use client";

import { useMemo, useState } from "react";
import type { ProfileConEntidad } from "@/lib/actions/usuarios";
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
  const [busqueda, setBusqueda] = useState("");

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
