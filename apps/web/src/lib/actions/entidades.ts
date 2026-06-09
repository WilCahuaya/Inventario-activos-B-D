"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/profile";

export async function createEntidad(formData: FormData) {
  await requireProfile("CONTADOR");
  const supabase = await createClient();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const ruc = String(formData.get("ruc") ?? "").trim() || null;

  if (!nombre) {
    return { error: "El nombre es obligatorio." };
  }

  const { error } = await supabase.from("entidades").insert({ nombre, ruc });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/contador/entidades");
  return { success: true };
}

export async function listEntidades() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entidades")
    .select("*")
    .eq("activo", true)
    .order("nombre");

  if (error) throw new Error(error.message);
  return data;
}
