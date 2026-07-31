import { useEffect, useState } from "react";
import { UsuariosGestionPanel } from "@inventario/ui";
import { useAuth } from "../hooks/useAuth";
import { useOnline } from "../hooks/useOnline";
import {
  deleteUsuario,
  inviteContador,
  listUsuarios,
  resendInvitacionUsuario,
  setUsuarioActivo,
  type ProfileConEntidad,
} from "../lib/usuarios";

export function UsuariosView() {
  const { user } = useAuth();
  const online = useOnline();
  const currentUserId = user?.id ?? "";
  const [usuarios, setUsuarios] = useState<ProfileConEntidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reloadUsuarios() {
    if (!online) {
      setError("Sin conexión. La gestión de usuarios requiere internet.");
      return;
    }
    const result = await listUsuarios();
    if (result.error) {
      setError(result.error);
      return;
    }
    setUsuarios(result.data ?? []);
    setError(null);
  }

  useEffect(() => {
    if (!online) {
      setLoading(false);
      setError("Sin conexión. La gestión de usuarios requiere internet.");
      setUsuarios([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void listUsuarios()
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          setError(result.error);
          return;
        }
        setUsuarios(result.data ?? []);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Error al cargar usuarios");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [online]);

  return (
    <div className="space-y-4">
      {!online && (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          Sin conexión: no se pueden invitar, desactivar ni eliminar usuarios hasta reconectar.
        </p>
      )}
      {error && online && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <UsuariosGestionPanel
        usuarios={usuarios}
        currentUserId={currentUserId}
        loading={loading}
        pageTitle="Usuarios"
        pageSubtitle="Gestione contadores del estudio e invíte administradores al crear una entidad."
        onInviteContador={online ? inviteContador : async () => ({ error: "Sin conexión." })}
        onResendInvitacion={
          online ? resendInvitacionUsuario : async () => ({ error: "Sin conexión." })
        }
        onSetUsuarioActivo={
          online ? setUsuarioActivo : async () => ({ error: "Sin conexión." })
        }
        onDeleteUsuario={online ? deleteUsuario : async () => ({ error: "Sin conexión." })}
        onRefresh={reloadUsuarios}
      />
    </div>
  );
}
