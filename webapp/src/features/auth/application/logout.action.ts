"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/shared/infrastructure/supabase/server-client";
import { IMPERSONATION_COOKIE } from "@/features/layout/domain/impersonation";

// Réplica de doLogout() en index.html (~1725-1729). El estado de
// impersonación en memoria (_realPerfil) se pierde solo con recargar la
// página; la cookie equivalente de esta migración (features/layout) sí
// persiste entre pestañas y hay que borrarla explícitamente aquí — si no,
// una sesión futura en el mismo navegador heredaría un rol impersonado
// ajeno (UI-11).
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const store = await cookies();
  store.delete(IMPERSONATION_COOKIE);
  redirect("/login");
}
