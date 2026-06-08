import Link from "next/link";
import { APP_CLIENT } from "@inventario/types";

export default function InicioPage() {
  return (
    <section className="space-y-8">
      <div className="rounded-xl border bg-card p-8 md:p-12">
        <p className="text-sm font-medium text-primary">{APP_CLIENT}</p>
        <h1 className="mt-2 text-4xl font-bold text-foreground">
          Gestión profesional de inventario de activos fijos
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Control, auditoría y valorización de activos para entidades públicas y privadas.
          Plataforma integral con trabajo en campo y acceso web seguro.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Iniciar sesión
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { title: "Inventario en campo", desc: "Escaneo, registro e impresión de etiquetas." },
          { title: "Control multi-entidad", desc: "Gestión centralizada para contadores." },
          { title: "Reportes valorizados", desc: "PDF y Excel con membrete institucional." },
        ].map((item) => (
          <div key={item.title} className="rounded-lg border bg-card p-6">
            <h2 className="font-semibold text-primary">{item.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
