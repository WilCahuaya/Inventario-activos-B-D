import { useEffect, useState } from "react";
import { UsuariosGestionPanel } from "@inventario/ui";
import { useAuth } from "../hooks/useAuth";
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
  const currentUserId = user?.id ?? "";
  const [usuarios, setUsuarios] = useState<ProfileConEntidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reloadUsuarios() {
    const result = await listUsuarios();
    if (result.error) {
      setError(result.error);
      return;
    }
    setUsuarios(result.data ?? []);
    setError(null);
  }

  useEffect(() => {
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
  }, []);

  return (
    <div className="space-y-4">
      {error && (
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
        onInviteContador={inviteContador}
        onResendInvitacion={resendInvitacionUsuario}
        onSetUsuarioActivo={setUsuarioActivo}
        onDeleteUsuario={deleteUsuario}
        onRefresh={reloadUsuarios}
      />
    </div>
  );
}
