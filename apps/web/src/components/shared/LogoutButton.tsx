"use client";

import { Button } from "@inventario/ui";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLogout}>
      Cerrar sesión
    </Button>
  );
}
