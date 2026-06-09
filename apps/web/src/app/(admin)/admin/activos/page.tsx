import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@inventario/ui";
import { ActivoForm } from "@/components/panel/ActivoForm";
import { ActivoUpload } from "@/components/panel/ActivoUpload";
import { getProfile } from "@/lib/auth/profile";
import { listActivos } from "@/lib/actions/activos";

export default async function AdminActivosPage() {
  const profile = await getProfile();
  if (!profile || profile.rol !== "ADMIN_ENTIDAD" || !profile.entidad_id) {
    redirect("/login");
  }

  const activos = await listActivos();

  return (
    <div className="space-y-6">
      <ActivoForm
        entidades={[]}
        fixedEntidadId={profile.entidad_id}
        submitLabel="Preregistrar activo"
        asignaCodigoInmediato={false}
      />

      <Card>
        <CardHeader>
          <CardTitle>Activos de su entidad</CardTitle>
        </CardHeader>
        <CardContent>
          {activos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay activos. Los registros quedan en estado PREREGISTRADO hasta que el contador
              los valide.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {activos.map((activo) => (
                <li key={activo.id} className="space-y-3 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{activo.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        Cat. {activo.codigo_catalogo} · {activo.estado_registro}
                        {activo.codigo_barras ? ` · ${activo.codigo_barras}` : ""}
                      </p>
                    </div>
                  </div>
                  <ActivoUpload
                    activoId={activo.id}
                    entidadId={activo.entidad_id}
                    fotoPath={activo.foto_path}
                    comprobantePath={activo.comprobante_path}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
