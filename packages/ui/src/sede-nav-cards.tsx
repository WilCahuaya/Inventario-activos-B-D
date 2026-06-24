import type { ReactNode } from "react";

export interface SedeNavItem {
  id: string;
  nombre: string;
  ambiente_count?: number;
}

type SedeLinkProps = {
  href: string;
  className: string;
  children: ReactNode;
};

const cardClass =
  "flex min-w-0 flex-col rounded-xl border border-border/70 bg-card px-4 py-3 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function SedeNavCards({
  sedes,
  className,
  getSedeHref,
  onSedeClick,
  LinkComponent,
}: {
  sedes: SedeNavItem[];
  className?: string;
  getSedeHref?: (sede: SedeNavItem) => string;
  onSedeClick?: (sede: SedeNavItem) => void;
  LinkComponent?: (props: SedeLinkProps) => ReactNode;
}) {
  if (sedes.length === 0) return null;

  const DefaultLink = ({ href, className: linkClass, children }: SedeLinkProps) => (
    <a href={href} className={linkClass}>
      {children}
    </a>
  );

  return (
    <div className={className}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Sucursales
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sedes.map((sede) => {
          const content = (
            <>
              <span className="truncate font-semibold text-primary">{sede.nombre}</span>
              <span className="mt-1 text-sm text-muted-foreground">
                {sede.ambiente_count ?? 0}{" "}
                {(sede.ambiente_count ?? 0) === 1 ? "ambiente" : "ambientes"}
              </span>
            </>
          );

          const href = getSedeHref?.(sede);
          if (href) {
            const LinkImpl = LinkComponent ?? DefaultLink;
            return (
              <LinkImpl key={sede.id} href={href} className={cardClass}>
                {content}
              </LinkImpl>
            );
          }

          return (
            <button
              key={sede.id}
              type="button"
              className={cardClass}
              onClick={() => onSedeClick?.(sede)}
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
