import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@inventario/ui";
import { createClient } from "@/lib/supabase/server";

export default async function AdminActivosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activos</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Registro y consulta de activos de su entidad — en desarrollo (Fase 2).
        </p>
      </CardContent>
    </Card>
  );
}
