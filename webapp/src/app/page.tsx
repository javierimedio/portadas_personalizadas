import { createClient } from "@/shared/infrastructure/supabase/server-client";
import { logout } from "@/features/auth/application/logout.action";

// Landing autenticada temporal: confirma que el login end-to-end funciona.
// El middleware garantiza que solo se llega aquí con sesión. Se sustituye en
// el próximo bloque por el layout con nav lateral + Dashboard reales
// (docs/06-roadmap.md — Fase 1).
export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const { data: perfil } = data.user
    ? await supabase.from("perfiles").select("nombre, rol").eq("id", data.user.id).maybeSingle()
    : { data: null };

  return (
    <main style={{ fontFamily: "monospace", padding: "2rem" }}>
      <h1>Portadas Personalizadas — entorno de desarrollo</h1>
      <p>
        Sesión iniciada como {perfil?.nombre ?? data.user?.email} ({perfil?.rol ?? "sin perfil"}).
      </p>
      <p>Fase 1 en construcción: el layout con navegación y el Dashboard llegan en el siguiente bloque.</p>
      <form action={logout}>
        <button type="submit">Cerrar sesión</button>
      </form>
    </main>
  );
}
