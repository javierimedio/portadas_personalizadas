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

// Deriva el path de Storage a partir de la URL pública cuando `storage_path`
// no está disponible en la BD (adjuntos creados antes de la migración
// 20260918000100_eliminar_adjuntos.sql). Formato conocido:
// https://<host>/storage/v1/object/public/<bucket>/<path>
export function storagePathDesdeUrl(url: string): string | null {
  const marker = `/${STORAGE_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx < 0) return null;
  try {
    return decodeURIComponent(url.slice(idx + marker.length));
  } catch {
    return url.slice(idx + marker.length);
  }
}
