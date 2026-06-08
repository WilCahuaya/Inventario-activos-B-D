import { PublicPageHeader } from "@/components/public/PublicPageHeader";
import { APP_CLIENT } from "@inventario/types";

export default function ContactoPage() {
  return (
    <section>
      <PublicPageHeader
        title="Contacto"
        description="Comuníquese con nosotros para consultas sobre inventario de activos."
      />
      <div className="max-w-lg space-y-4 rounded-lg border bg-card p-6 text-sm">
        <p>
          <span className="font-medium text-foreground">Empresa:</span> {APP_CLIENT}
        </p>
        <p>
          <span className="font-medium text-foreground">RUC:</span> 20614326418
        </p>
        <p className="text-muted-foreground">
          Formulario de contacto en desarrollo — Fase 2 del sitio público.
        </p>
      </div>
    </section>
  );
}
