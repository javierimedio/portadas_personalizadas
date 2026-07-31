import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Cliente para Server Components y Server Actions: siempre lleva el JWT de
// la sesión del usuario. Nunca usar la service_role key aquí — ver
// docs/02-arquitectura.md § 2.6 y § 2.7.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Se llama desde un Server Component sin permiso de escritura;
            // el middleware ya se encarga de refrescar la sesión en ese caso.
          }
        },
      },
    }
  );
}
