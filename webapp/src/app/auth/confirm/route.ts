import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/shared/infrastructure/supabase/server-client";

// Ruta técnica sin equivalente en index.html: intercambia el código PKCE del
// enlace de recuperación por una sesión de servidor (patrón estándar de
// @supabase/ssr — ver docs/01-analisis-funcional.md § 1.4.1). El destino final
// (/recuperar) y los mensajes que ve el usuario son los mismos.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/recuperar";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/recuperar?error=invalid_token`);
}
