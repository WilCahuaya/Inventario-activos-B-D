"use client";

import { displayContadorNombre } from "@inventario/types";
import { BdPortalShell, EntityPortalMenu, type EntityPortalMenuItem } from "@inventario/ui/panel";
import { DESKTOP_PORTAL_HERO_DARK, DESKTOP_PORTAL_HERO_LIGHT } from "../lib/portal-assets";
import { signOut } from "../hooks/useAuth";

interface ContadorPortalDesktopProps {
  nombre: string;
  email: string;
  onGestionInventarios: () => void;
}

export function ContadorPortalDesktop({
  nombre,
  email,
  onGestionInventarios,
}: ContadorPortalDesktopProps) {
  const items: EntityPortalMenuItem[] = [
    { id: "financieros", label: "Estado Financieros", disabled: true },
    {
      id: "inventarios",
      label: "Gestión de Inventarios",
      onClick: onGestionInventarios,
      highlight: true,
    },
    { id: "archivo", label: "Archivo Permanente", disabled: true },
    { id: "otros", label: "Otros", disabled: true },
  ];

  return (
    <BdPortalShell
      onExit={() => void signOut()}
      showBranding={false}
      heroLightSrc={DESKTOP_PORTAL_HERO_LIGHT}
      heroDarkSrc={DESKTOP_PORTAL_HERO_DARK}
    >
      <EntityPortalMenu
        entidadNombre={displayContadorNombre(nombre, email)}
        subtitleLines={[email]}
        titleVariant="person"
        items={items}
      />
    </BdPortalShell>
  );
}
