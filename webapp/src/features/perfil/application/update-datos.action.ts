"use server";

import { createClient } from "@/shared/infrastructure/supabase/server-client";

// Réplica de savePerfilDatos() en index.html (~5808-5843): mismas
// validaciones (PERF-05/06) y mismo comportamiento de cambio de email —
// no se aplica al instante, requiere confirmación en el correo nuevo
// (PERF-04, comportamiento por defecto de Supabase Auth).
// Réplica de perfilAlert(msg, 'ok'|'info', ...) (~5798-5843): "Datos
// actualizados correctamente." usa el tipo 'ok' (verde); solo el aviso de
// confirmación de email usa 'info' (azul) — no los dos por igual.
export type UpdateDatosState = { error?: string; success?: string; successKind?: "ok" | "info" } | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function updateDatos(_prev: UpdateDatosState, formData: FormData): Promise<UpdateDatosState> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!nombre) return { error: "El nombre no puede estar vacío." };
  if (!email || !EMAIL_RE.test(email)) return { error: "Introduce un email válido." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Sesión no válida." };

  const { error: perfilError } = await supabase.from("perfiles").update({ nombre }).eq("id", data.user.id);
  if (perfilError) return { error: `Error: ${perfilError.message}` };

  if (email !== data.user.email) {
    const { error: emailError } = await supabase.auth.updateUser({ email });
    if (emailError) return { error: `Error: ${emailError.message}` };
    return { success: "Nombre actualizado. Revisa tu bandeja de entrada para confirmar el nuevo email.", successKind: "info" };
  }

  return { success: "Datos actualizados correctamente.", successKind: "ok" };
}
