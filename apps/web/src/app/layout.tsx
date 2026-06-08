import type { Metadata } from "next";
import { APP_CLIENT, APP_NAME } from "@inventario/types";
import "@inventario/ui/globals.css";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: `Plataforma web — ${APP_CLIENT}`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
