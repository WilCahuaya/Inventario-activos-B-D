import Link from "next/link";
import { PUBLIC_NAV } from "@/lib/routes";
import { BrandLogo } from "@/components/public/BrandLogo";
import { ThemeToggle } from "@/components/public/ThemeToggle";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <BrandLogo />

        <div className="flex flex-wrap items-center gap-1">
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
          </nav>
          <ThemeToggle />
          <Link
            href="/login"
            className="ml-1 inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </header>
  );
}
