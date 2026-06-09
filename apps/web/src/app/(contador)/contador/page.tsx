import { redirect } from "next/navigation";
import Link from "next/link";
import { PanelBanner, PanelPageHeader, PanelStatCard } from "@/components/panel/panel-ui";
import { getProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export default async function ContadorDashboardPage() {
  const profile = await getProfile();
  if (!profile || profile.rol !== "CONTADOR") redirect("/login");

  const supabase = await createClient();
  const [{ count: entidades }, { count: activos }, { count: preregistrados }, { count: usuarios }] =
    await Promise.all([
      supabase.from("entidades").select("*", { count: "exact", head: true }).eq("activo", true),
      supabase.from("activos").select("*", { count: "exact", head: true }),
      supabase
        .from("activos")
        .select("*", { count: "exact", head: true })
        .eq("estado_registro", "PREREGISTRADO"),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
    ]);

  return (
    <div className="space-y-6">
      <PanelPageHeader
        title="Dashboard"
        subtitle="Resumen del inventario de activos fijos"
      />

      <PanelBanner
        label="Contador"
        title={profile.nombre}
        subtitle={profile.email}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PanelStatCard label="Entidades" value={entidades ?? 0} href="/contador/entidades" />
        <PanelStatCard label="Activos totales" value={activos ?? 0} href="/contador/inventario" />
        <PanelStatCard
          label="Preregistrados"
          value={preregistrados ?? 0}
          href="/contador/inventario?estado=PREREGISTRADO"
        />
        <PanelStatCard label="Usuarios" value={usuarios ?? 0} href="/contador/usuarios" />
      </div>

      <Link
        href="/contador/inventario"
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Ir al inventario global
      </Link>
    </div>
  );
}
