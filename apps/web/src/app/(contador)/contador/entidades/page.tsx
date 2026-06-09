import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@inventario/ui";
import { EntidadForm } from "@/components/panel/EntidadForm";
import { requireProfile } from "@/lib/auth/profile";
import { listEntidades } from "@/lib/actions/entidades";

export default async function ContadorEntidadesPage() {
  try {
    await requireProfile("CONTADOR");
  } catch {
    redirect("/login");
  }

  const entidades = await listEntidades();

  return (
    <div className="space-y-6">
      <EntidadForm />

      <Card>
        <CardHeader>
          <CardTitle>Entidades registradas</CardTitle>
        </CardHeader>
        <CardContent>
          {entidades.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay entidades. Cree la primera arriba.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {entidades.map((entidad) => (
                <li key={entidad.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{entidad.nombre}</p>
                    {entidad.ruc && (
                      <p className="text-xs text-muted-foreground">RUC {entidad.ruc}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
