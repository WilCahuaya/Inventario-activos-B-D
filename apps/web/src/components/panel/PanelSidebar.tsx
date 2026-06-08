import Link from "next/link";

interface PanelSidebarProps {
  title: string;
  links: { href: string; label: string }[];
}

export function PanelSidebar({ title, links }: PanelSidebarProps) {
  return (
    <aside className="w-56 shrink-0 border-r bg-card p-4">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md px-3 py-2 text-sm hover:bg-accent"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
