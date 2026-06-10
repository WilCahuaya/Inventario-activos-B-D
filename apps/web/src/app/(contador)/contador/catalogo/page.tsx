import { redirect } from "next/navigation";
import { CatalogoPanel } from "@/components/panel/CatalogoPanel";
import { PanelPageHeader } from "@/components/panel/panel-ui";
import { requireProfile } from "@/lib/auth/profile";

export default async function ContadorCatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; codigo?: string }>;
}) {
  try {
    await requireProfile("CONTADOR");
  } catch {
    redirect("/login");
  }

  const params = await searchParams;

  return (
    <div className="space-y-6">
      <PanelPageHeader
        title="Catálogo nacional"
        subtitle="Agregar ítems que no existen en la base oficial (cuchara, olla, sartén, etc.)"
      />
      <CatalogoPanel initialDenominacion={params.q ?? ""} initialCodigo={params.codigo ?? ""} />
    </div>
  );
}
