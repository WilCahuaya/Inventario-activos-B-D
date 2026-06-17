"use client";

import { useRouter } from "next/navigation";
import { UsuariosGestionPanel, type ProfileConEntidad } from "@inventario/ui";
import {
  deleteUsuario,
  inviteContador,
  setUsuarioActivo,
} from "@/lib/actions/usuarios";

interface UsuariosPageClientProps {
  usuarios: ProfileConEntidad[];
  currentUserId: string;
}

export function UsuariosPageClient({ usuarios, currentUserId }: UsuariosPageClientProps) {
  const router = useRouter();

  return (
    <UsuariosGestionPanel
      usuarios={usuarios}
      currentUserId={currentUserId}
      onInviteContador={inviteContador}
      onSetUsuarioActivo={setUsuarioActivo}
      onDeleteUsuario={deleteUsuario}
      onRefresh={() => router.refresh()}
    />
  );
}
