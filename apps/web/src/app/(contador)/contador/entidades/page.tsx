import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@inventario/ui";
import { createClient } from "@/lib/supabase/server";

export default async function ContadorEntidadesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entidades</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Gestión de entidades clientes — en desarrollo (Fase 2).
        </p>
      </CardContent>
    </Card>
  );
}
