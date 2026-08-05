"use server";

import { createClient } from "@/shared/infrastructure/supabase/server-client";

// Réplica de saveUser() en su rama de edición (~3748-3753, USR-07): solo
// nombre/rol/código — nunca email ni contraseña desde este modal.
export async function actualizarUsuario(id: string, input: { nombre: string; rol: string; codigo: string }): Promise<{ error?: string }> {
  if (!input.nombre) return { error: "El nombre es obligatorio." };
  const supabase = await createClient();
  const { error } = await supabase.from("perfiles").update({ nombre: input.nombre, rol: input.rol, codigo: input.codigo }).eq("id", id);
  if (error) return { error: `Error: ${error.message}` };
  return {};
}

// Réplica de toggleUser() (~3780-3783, USR-11): sin confirmación, un clic.
export async function toggleUsuario(id: string, activo: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("perfiles").update({ activo: !activo }).eq("id", id);
  if (error) return { error: `Error: ${error.message}` };
  return {};
}
