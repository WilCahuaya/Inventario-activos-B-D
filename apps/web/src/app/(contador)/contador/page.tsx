import { redirect } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@inventario/ui";
import { createClient } from "@/lib/supabase/server";

export default async function ContadorDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard — Contador</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Sesión iniciada. Los módulos completos se implementarán en Fase 2. La validación
          de rol se agregará en Fase 1.
        </p>
        <dl className="grid gap-2 rounded-lg border bg-muted/30 p-4 text-sm">
          <div className="flex gap-2">
            <dt className="font-medium text-muted-foreground">Usuario:</dt>
            <dd>{user.email}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled>
            Entidades (Fase 2)
          </Button>
          <Button variant="secondary" disabled>
            Inventario (Fase 2)
          </Button>
          <Button variant="secondary" disabled>
            Reportes (Fase 4)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
