import Link from "next/link";
import { PublicPageHeader } from "@/components/public/PublicPageHeader";

const POSTS = [
  {
    slug: "inventario-activos-municipalidades",
    title: "Inventario de activos en municipalidades",
    date: "Junio 2026",
    excerpt: "Buenas prácticas para el control patrimonial en entidades públicas.",
  },
  {
    slug: "codigo-barras-inventario",
    title: "Códigos de barras en inventario físico",
    date: "Junio 2026",
    excerpt: "Cómo agilizar la auditoría con etiquetas y escaneo en campo.",
  },
];

export default function BlogPage() {
  return (
    <section>
      <PublicPageHeader
        title="Blog y noticias"
        description="Artículos y novedades sobre gestión de activos fijos."
      />
      <div className="space-y-4">
        {POSTS.map((post) => (
          <article key={post.slug} className="rounded-lg border bg-card p-6">
            <p className="text-xs text-muted-foreground">{post.date}</p>
            <h2 className="mt-1 text-lg font-semibold">
              <Link href={`/blog/${post.slug}`} className="text-primary hover:underline">
                {post.title}
              </Link>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
