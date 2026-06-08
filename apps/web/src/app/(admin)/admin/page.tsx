import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@inventario/ui";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mi inventario</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Vista del administrador de entidad — en desarrollo (Fase 2). Validación de rol en
          Fase 1.
        </p>
        <dl className="grid gap-2 rounded-lg border bg-muted/30 p-4 text-sm">
          <div className="flex gap-2">
            <dt className="font-medium text-muted-foreground">Usuario:</dt>
            <dd>{user.email}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
