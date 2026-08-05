import { createClient } from "@/shared/infrastructure/supabase/server-client";
import { AppShell } from "@/features/layout/ui/app-shell";

// El middleware ya garantiza sesión en todo lo que no sea público
// (shared/infrastructure/supabase/middleware.ts); aquí solo se lee el
// perfil para pintar la topbar y el nav por rol (docs/06-roadmap.md, Fase 1).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const { data: perfil } = data.user
    ? await supabase.from("perfiles").select("nombre, rol").eq("id", data.user.id).maybeSingle()
    : { data: null };

  return (
    <AppShell email={data.user?.email ?? ""} nombre={perfil?.nombre ?? null} rol={perfil?.rol ?? null}>
      {children}
    </AppShell>
  );
}
