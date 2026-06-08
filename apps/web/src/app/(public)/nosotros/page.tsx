import { PublicPageHeader } from "@/components/public/PublicPageHeader";

export default function NosotrosPage() {
  return (
    <section>
      <PublicPageHeader
        title="Nosotros"
        description="Conozca a B&D Consultores Global EIRL y nuestro compromiso con la gestión de activos."
      />
      <div className="prose max-w-none text-muted-foreground">
        <p>Contenido en desarrollo — Fase 2 del sitio público.</p>
      </div>
    </section>
  );
}
