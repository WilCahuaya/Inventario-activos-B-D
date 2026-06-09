import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@inventario/ui";
import { ActivoForm } from "@/components/panel/ActivoForm";
import { ActivoUpload } from "@/components/panel/ActivoUpload";
import { RegistrarActivoButton } from "@/components/panel/RegistrarActivoButton";
import { listActivos } from "@/lib/actions/activos";
import { listEntidades } from "@/lib/actions/entidades";
import { requireProfile } from "@/lib/auth/profile";

export default async function ContadorInventarioPage() {
  try {
    await requireProfile("CONTADOR");
  } catch {
    redirect("/login");
  }

  const [entidades, activos] = await Promise.all([listEntidades(), listActivos()]);

  return (
    <div className="space-y-6">
      <ActivoForm
        entidades={entidades}
        submitLabel="Registrar activo (REGISTRADO)"
        asignaCodigoInmediato
      />

      <Card>
        <CardHeader>
          <CardTitle>Inventario de activos</CardTitle>
        </CardHeader>
        <CardContent>
          {activos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay activos registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pr-4">Código</th>
                    <th className="py-2 pr-4">Nombre</th>
                    <th className="py-2 pr-4">Entidad</th>
                    <th className="py-2 pr-4">Estado</th>
                    <th className="py-2 pr-4">Archivos</th>
                    <th className="py-2">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {activos.map((activo) => {
                    const entidadNombre =
                      (activo.entidades as { nombre: string } | null)?.nombre ?? "—";
                    return (
                      <tr key={activo.id} className="border-b align-top">
                        <td className="py-3 pr-4 font-mono text-xs">
                          {activo.codigo_barras ?? "—"}
                        </td>
                        <td className="py-3 pr-4">{activo.nombre}</td>
                        <td className="py-3 pr-4">{entidadNombre}</td>
                        <td className="py-3 pr-4">
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                            {activo.estado_registro}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <ActivoUpload
                            activoId={activo.id}
                            entidadId={activo.entidad_id}
                            fotoPath={activo.foto_path}
                            comprobantePath={activo.comprobante_path}
                          />
                        </td>
                        <td className="py-3">
                          {activo.estado_registro === "PREREGISTRADO" && (
                            <RegistrarActivoButton activoId={activo.id} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
