import type { SupabaseClient } from "@supabase/supabase-js";
import { STORAGE_BUCKET } from "./constants";

// Limpieza server-side de archivos ya subidos que un Server Action decide
// no usar (p.ej. carga masiva: el archivo se sube desde el navegador antes
// de saber si su nombre coincide con alguna solicitud en BD) — evita basura
// acumulándose en el bucket. Best-effort: el resultado no se comprueba
// porque nunca debe bloquear la respuesta al usuario.
export async function borrarArchivosStorage(supabase: SupabaseClient, paths: string[]): Promise<void> {
  if (!paths.length) return;
  await supabase.storage.from(STORAGE_BUCKET).remove(paths);
}
