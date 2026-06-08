import { PublicPageHeader } from "@/components/public/PublicPageHeader";

const SERVICIOS = [
  "Inventario físico de activos fijos",
  "Auditoría y verificación en campo",
  "Valorización y depreciación",
  "Reportes institucionales PDF/Excel",
];

export default function ServiciosPage() {
  return (
    <section>
      <PublicPageHeader
        title="Servicios"
        description="Soluciones de inventario y control patrimonial para su entidad."
      />
      <ul className="grid gap-3 md:grid-cols-2">
        {SERVICIOS.map((servicio) => (
          <li key={servicio} className="rounded-lg border bg-card p-4 text-sm">
            {servicio}
          </li>
        ))}
      </ul>
    </section>
  );
}
