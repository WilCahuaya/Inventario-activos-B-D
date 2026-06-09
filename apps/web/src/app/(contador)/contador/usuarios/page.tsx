import { redirect } from "next/navigation";
import { UsuariosPanel } from "@/components/panel/UsuariosPanel";
import { PanelPageHeader } from "@/components/panel/panel-ui";
import { listUsuarios } from "@/lib/actions/usuarios";
import { requireProfile } from "@/lib/auth/profile";

export default async function ContadorUsuariosPage() {
  try {
    await requireProfile("CONTADOR");
  } catch {
    redirect("/login");
  }

  const usuarios = await listUsuarios();

  return (
    <div className="space-y-6">
      <PanelPageHeader
        title="Usuarios"
        subtitle="Listado de usuarios del sistema. Los administradores se invitan al crear una entidad."
      />
      <UsuariosPanel usuarios={usuarios} />
    </div>
  );
}
