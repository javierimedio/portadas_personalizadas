"use server";

import { createClient } from "@/shared/infrastructure/supabase/server-client";

// Réplica de savePerfilPassword() en index.html (~5845-5874). No reutiliza
// el update-password.action.ts de features/auth (recuperación): ese
// combina "vacía" y "<8 caracteres" en un solo mensaje porque así lo hace
// doRecovery(); savePerfilPassword() usa dos mensajes distintos para cada
// caso, y hay que preservar ambos textos tal cual (PERF-08).
export type UpdatePerfilPasswordState = { error?: string; success?: boolean } | null;

export async function updatePerfilPassword(
  _prev: UpdatePerfilPasswordState,
  formData: FormData
): Promise<UpdatePerfilPasswordState> {
  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password2") ?? "");

  if (!password) {
    return { error: "Introduce una nueva contraseña." };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (password !== password2) {
    return { error: "Las contraseñas no coinciden." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: `Error: ${error.message || "Error al actualizar contraseña"}` };
  }
  return { success: true };
}
