import { PublicPageHeader } from "@/components/public/PublicPageHeader";

export default function ClientesPage() {
  return (
    <section>
      <PublicPageHeader
        title="Clientes"
        description="Entidades que confían en nuestros servicios de inventario."
      />
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {["Municipalidad", "Entidad pública", "Empresa privada"].map((cliente) => (
          <div
            key={cliente}
            className="flex h-24 items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground"
          >
            {cliente} — próximamente
          </div>
        ))}
      </div>
    </section>
  );
}
