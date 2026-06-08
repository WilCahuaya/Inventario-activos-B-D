import Link from "next/link";
import { notFound } from "next/navigation";

const POSTS: Record<string, { title: string; date: string; content: string }> = {
  "inventario-activos-municipalidades": {
    title: "Inventario de activos en municipalidades",
    date: "Junio 2026",
    content:
      "Artículo en desarrollo. Aquí se publicará contenido sobre buenas prácticas de inventario en entidades públicas.",
  },
  "codigo-barras-inventario": {
    title: "Códigos de barras en inventario físico",
    date: "Junio 2026",
    content:
      "Artículo en desarrollo. Aquí se explicará el uso de etiquetas y pistolas lectoras en auditorías de campo.",
  },
};

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = POSTS[slug];

  if (!post) notFound();

  return (
    <article>
      <Link href="/blog" className="text-sm text-primary hover:underline">
        ← Volver al blog
      </Link>
      <p className="mt-4 text-xs text-muted-foreground">{post.date}</p>
      <h1 className="mt-1 text-3xl font-bold text-primary">{post.title}</h1>
      <p className="mt-6 text-muted-foreground">{post.content}</p>
    </article>
  );
}
