import { createClient } from "@/lib/supabase/server";
import { provisionProfileFromEntidad } from "@/lib/auth/entidad-admin";
import { homePathForRole } from "@inventario/types";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = await createClient();
  const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

  if (sessionError) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("rol, activo")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.activo) {
    const provisioned = await provisionProfileFromEntidad(user);
    if (provisioned?.activo) {
      profile = provisioned;
    }
  }

  if (!profile?.activo) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=no_profile`);
  }

  const redirectPath = homePathForRole(profile.rol);
  return NextResponse.redirect(`${origin}${redirectPath}`);
}
