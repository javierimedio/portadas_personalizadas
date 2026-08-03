"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/shared/infrastructure/supabase/server-client";

// Réplica de doLogout() en index.html (~1725-1729), sin la parte de
// impersonación (_realPerfil): esa pieza llega con el selector "Ver como rol"
// en el bloque de Layout/topbar, no en este.
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
