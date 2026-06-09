import { useEffect, useState } from "react";
import type { Profile } from "@inventario/types";
import { fetchProfile } from "../lib/profile";

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchProfile()
      .then((p) => {
        if (cancelled) return;
        if (!p) {
          setError("No se encontró un perfil activo para este usuario.");
          setProfile(null);
        } else if (p.rol !== "CONTADOR") {
          setError("La app de escritorio es solo para usuarios con rol Contador.");
          setProfile(null);
        } else {
          setProfile(p);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar perfil");
          setProfile(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { profile, loading, error };
}
