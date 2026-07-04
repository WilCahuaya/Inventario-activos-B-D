import type { ReactNode } from "react";

export interface PanelBreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  /** Reemplaza el texto del segmento (p. ej. selector de ambiente). */
  slot?: ReactNode;
}

/** Inserta la sede en la ruta justo antes del segmento en `beforeIndex`. */
export function withSedeBreadcrumb(
  items: PanelBreadcrumbItem[],
  sedeNombre: string | null | undefined,
  beforeIndex: number,
  sedeLink?: Pick<PanelBreadcrumbItem, "href" | "onClick">,
): PanelBreadcrumbItem[] {
  const sede = sedeNombre?.trim();
  if (!sede || beforeIndex < 0 || beforeIndex > items.length) return items;
  const out = [...items];
  out.splice(beforeIndex, 0, { label: sede, ...sedeLink });
  return out;
}

type BreadcrumbLinkProps = {
  href: string;
  className?: string;
  title?: string;
  children: ReactNode;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const crumbLinkClass = "truncate font-medium text-primary hover:underline";
const crumbCurrentClass = "truncate font-semibold text-foreground";

export function PanelBreadcrumbs({
  items,
  className,
  LinkComponent,
}: {
  items: PanelBreadcrumbItem[];
  className?: string;
  LinkComponent?: (props: BreadcrumbLinkProps) => ReactNode;
}) {
  if (items.length === 0) return null;

  const DefaultLink = ({ href, className: linkClass, title, children }: BreadcrumbLinkProps) => (
    <a href={href} className={linkClass} title={title}>
      {children}
    </a>
  );
  const LinkImpl = LinkComponent ?? DefaultLink;

  return (
    <nav
      aria-label="Ruta de navegación"
      className={cn("flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-sm", className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const clickable = !isLast && !item.slot && Boolean(item.href || item.onClick);

        return (
          <span key={`${item.label}-${index}`} className="inline-flex max-w-full items-center gap-1.5">
            {index > 0 && (
              <span className="shrink-0 text-muted-foreground/70" aria-hidden>
                |
              </span>
            )}
            {item.slot ? (
              <span className="inline-flex min-w-0 max-w-full items-center">{item.slot}</span>
            ) : clickable && item.href ? (
              <LinkImpl href={item.href} className={crumbLinkClass} title={item.label}>
                {item.label}
              </LinkImpl>
            ) : clickable && item.onClick ? (
              <button
                type="button"
                onClick={item.onClick}
                className={crumbLinkClass}
                title={item.label}
              >
                {item.label}
              </button>
            ) : (
              <span className={isLast ? crumbCurrentClass : "truncate font-medium text-foreground"} title={item.label}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
