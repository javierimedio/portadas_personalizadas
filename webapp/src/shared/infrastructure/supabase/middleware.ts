import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rutas accesibles sin sesión — el resto exige estar autenticado, y /login
// redirige a quien ya tiene sesión iniciada (equivalente a showAuthScreen()
// vs initApp() en index.html, pero decidido aquí en vez de en el cliente).
const PUBLIC_PATHS = ["/login", "/recuperar", "/auth/confirm"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Refresca la sesión de Supabase en cada petición y decide la redirección de
// rutas (Fase 1, docs/06-roadmap.md). Ver
// https://supabase.com/docs/guides/auth/server-side/nextjs — patrón estándar.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // INSTRUMENTACIÓN TEMPORAL (2026-08-05) — diagnóstico del 500
  // MIDDLEWARE_INVOCATION_FAILED / "Invalid supabaseUrl" en producción. No
  // imprime el valor completo ni la anon key. Quitar en cuanto se confirme
  // la causa exacta.
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  console.log("[middleware-diag] NEXT_PUBLIC_SUPABASE_URL", {
    existe: rawUrl !== undefined,
    tipo: typeof rawUrl,
    longitud: rawUrl?.length ?? null,
    primerosCaracteres: rawUrl?.slice(0, 12) ?? null,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  if (!data.user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (data.user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
