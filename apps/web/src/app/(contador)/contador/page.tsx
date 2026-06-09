import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@inventario/ui";
import { getProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export default async function ContadorDashboardPage() {
  const profile = await getProfile();
  if (!profile || profile.rol !== "CONTADOR") redirect("/login");

  const supabase = await createClient();
  const [{ count: entidades }, { count: activos }, { count: preregistrados }] = await Promise.all([
    supabase.from("entidades").select("*", { count: "exact", head: true }).eq("activo", true),
    supabase.from("activos").select("*", { count: "exact", head: true }),
    supabase
      .from("activos")
      .select("*", { count: "exact", head: true })
      .eq("estado_registro", "PREREGISTRADO"),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard — Contador</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Bienvenido, <strong>{profile.nombre}</strong> ({profile.email})
          </p>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/30 p-4">
              <dt className="text-xs text-muted-foreground">Entidades</dt>
              <dd className="text-2xl font-bold text-primary">{entidades ?? 0}</dd>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <dt className="text-xs text-muted-foreground">Activos totales</dt>
              <dd className="text-2xl font-bold text-primary">{activos ?? 0}</dd>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <dt className="text-xs text-muted-foreground">Por validar</dt>
              <dd className="text-2xl font-bold text-primary">{preregistrados ?? 0}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/contador/entidades"
              className="inline-flex h-10 items-center justify-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:opacity-90"
            >
              Gestionar entidades
            </Link>
            <Link
              href="/contador/inventario"
              className="inline-flex h-10 items-center justify-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:opacity-90"
            >
              Ver inventario
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
