import { redirect } from "next/navigation";
import Link from "next/link";
import { PanelBanner, PanelPageHeader, PanelStatCard } from "@/components/panel/panel-ui";
import { getProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const profile = await getProfile();
  if (!profile || profile.rol !== "ADMIN_ENTIDAD") redirect("/login");

  const supabase = await createClient();
  const [{ count: activosTotal }, { count: preregistrados }] = await Promise.all([
    supabase
      .from("activos")
      .select("*", { count: "exact", head: true })
      .eq("entidad_id", profile.entidad_id!),
    supabase
      .from("activos")
      .select("*", { count: "exact", head: true })
      .eq("entidad_id", profile.entidad_id!)
      .eq("estado_registro", "PREREGISTRADO"),
  ]);

  const { data: entidad } = await supabase
    .from("entidades")
    .select("nombre, ruc")
    .eq("id", profile.entidad_id!)
    .single();

  return (
    <div className="space-y-6">
      <PanelPageHeader
        title="Mi inventario"
        subtitle="Panel de administración de su entidad"
      />

      <PanelBanner
        label="Entidad"
        title={entidad?.nombre ?? "Su entidad"}
        subtitle={entidad?.ruc ? `RUC ${entidad.ruc}` : profile.email}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <PanelStatCard label="Activos en la entidad" value={activosTotal ?? 0} href="/admin/activos" />
        <PanelStatCard label="Mis preregistros" value={preregistrados ?? 0} href="/admin/activos" />
      </div>

      <Link
        href="/admin/activos"
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Ver ambientes e inventario
      </Link>
    </div>
  );
}
