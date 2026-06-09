import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@inventario/ui";
import { getProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const profile = await getProfile();
  if (!profile || profile.rol !== "ADMIN_ENTIDAD") redirect("/login");

  const supabase = await createClient();
  const { count } = await supabase
    .from("activos")
    .select("*", { count: "exact", head: true })
    .eq("entidad_id", profile.entidad_id!);

  const { data: entidad } = await supabase
    .from("entidades")
    .select("nombre")
    .eq("id", profile.entidad_id!)
    .single();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mi inventario</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {entidad?.nombre ?? "Su entidad"} — {profile.nombre}
        </p>
        <dl className="grid gap-2 rounded-lg border bg-muted/30 p-4 text-sm">
          <div className="flex gap-2">
            <dt className="font-medium text-muted-foreground">Activos:</dt>
            <dd>{count ?? 0}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium text-muted-foreground">Correo:</dt>
            <dd>{profile.email}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
