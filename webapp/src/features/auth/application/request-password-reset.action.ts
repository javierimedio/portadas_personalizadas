"use server";

import { headers } from "next/headers";
import { createClient } from "@/shared/infrastructure/supabase/server-client";

// Réplica de doReset() en index.html (~1735-1740):
// - Correo vacío: no hace nada, no muestra ningún mensaje (mismo comportamiento
//   que el `if (!email) return;` original).
// - Correo no vacío: siempre responde con el mismo mensaje de éxito, exista o
//   no ese correo en el sistema (AUT-06, anti-enumeración) — el resultado real
//   de resetPasswordForEmail no se comprueba a propósito, igual que en el
//   original, que tampoco mira el `error` de esa llamada.
export type ResetState = { sent: boolean } | null;

export async function requestPasswordReset(
  _prev: ResetState,
  formData: FormData
): Promise<ResetState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return null;

  const supabase = await createClient();
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/recuperar`,
  });

  return { sent: true };
}
