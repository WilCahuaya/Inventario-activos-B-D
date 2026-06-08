import Link from "next/link";
import { APP_CLIENT, APP_NAME } from "@inventario/types";
import { PUBLIC_NAV } from "@/lib/routes";

export function Navbar() {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="hover:opacity-90">
          <p className="text-lg font-semibold text-primary">{APP_NAME}</p>
          <p className="text-xs text-muted-foreground">{APP_CLIENT}</p>
        </Link>

        <nav className="flex flex-wrap items-center gap-1">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="ml-2 inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Iniciar sesión
          </Link>
        </nav>
      </div>
    </header>
  );
}
