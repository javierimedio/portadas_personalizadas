import { createClient } from "@/shared/infrastructure/supabase/server-client";
import type { PerfilUsuario } from "../domain/types";

// Réplica de la carga de #page-usuarios (index.html ~1953, renderUsuariosTable).
export async function getUsuarios(): Promise<PerfilUsuario[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("perfiles")
    .select("id, nombre, email, rol, codigo, activo, created_at")
    .order("created_at", { ascending: false });
  return data ?? [];
}
