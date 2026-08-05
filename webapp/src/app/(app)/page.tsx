import { redirect } from "next/navigation";
import { createClient } from "@/shared/infrastructure/supabase/server-client";
import { getNavItemsForRole } from "@/features/layout/domain/nav-items";

// Réplica de NAV-07 (activación automática de la primera pestaña visible al
// construir el nav) trasladada a rutas reales: "/" redirige al primer item
// que ese rol vería en el nav.
export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const { data: perfil } = data.user
    ? await supabase.from("perfiles").select("rol").eq("id", data.user.id).maybeSingle()
    : { data: null };

  const [firstItem] = getNavItemsForRole(perfil?.rol);
  if (firstItem) {
    redirect(firstItem.href);
  }

  // H-07 (docs/09-matriz-paridad-funcional.md): roles legacy genéricos sin
  // ningún item de nav — misma zona principal vacía que en index.html hoy.
  return null;
}
