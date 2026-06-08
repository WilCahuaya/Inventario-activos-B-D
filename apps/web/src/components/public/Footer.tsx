import { APP_CLIENT } from "@inventario/types";

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-card">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">{APP_CLIENT}</p>
        <p className="mt-1">RUC 20614326418</p>
        <p className="mt-4 text-xs">© {new Date().getFullYear()} — Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
