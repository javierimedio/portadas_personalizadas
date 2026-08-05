import { redirect } from "next/navigation";
import { createClient } from "@/shared/infrastructure/supabase/server-client";
import { getNavItemsForRole } from "../domain/nav-items";

// index.html nunca necesitó esto: al ser un SPA sin rutas reales, una pestaña
// oculta por buildNav() era simplemente inalcanzable (nunca se pintaba). En
// Next.js cada módulo tiene una URL real navegable directamente, así que la
// misma lista de roles que decide qué botón de nav se ve (nav-items.ts) debe
// usarse también para negar el acceso directo a la ruta — si no, ocultar el
// botón deja de ser una restricción real. No hay equivalente en index.html
// que replicar aquí: es infraestructura necesaria por el cambio de
// arquitectura, no una funcionalidad migrada.
// Devuelve el rol real (no el impersonado) para que la página no tenga que
// repetir su propia consulta de perfil solo para saber quién es.
export async function requireRouteAccess(pathname: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const { data: perfil } = data.user
    ? await supabase.from("perfiles").select("rol").eq("id", data.user.id).maybeSingle()
    : { data: null };

  const rol = perfil?.rol ?? null;
  const allowed = getNavItemsForRole(rol).some((item) => item.href === pathname);
  if (!allowed) {
    redirect("/");
  }
  return rol;
}
