"use server";

import { createClient } from "@/shared/infrastructure/supabase/server-client";

// Réplica de doRecovery() en index.html (~1669-1712): mismas validaciones y
// mismos mensajes (AUT-08). Difiere en un punto de implementación, no de
// comportamiento observable: el original usa el access_token de la URL para
// un PUT directo a /auth/v1/user; aquí la sesión de recuperación ya se
// estableció en el servidor vía /auth/confirm (intercambio de código PKCE de
// @supabase/ssr), así que updateUser() actúa sobre esa sesión.
export type UpdatePasswordState = { error?: string; success?: boolean } | null;

export async function updatePassword(
  _prev: UpdatePasswordState,
  formData: FormData
): Promise<UpdatePasswordState> {
  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password2") ?? "");

  if (!password || password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (password !== password2) {
    return { error: "Las contraseñas no coinciden." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message || "Error al actualizar la contraseña." };
  }
  return { success: true };
}
