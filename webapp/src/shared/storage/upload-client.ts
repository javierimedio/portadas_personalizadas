"use client";

import { createClient } from "@/shared/infrastructure/supabase/browser-client";
import { STORAGE_BUCKET } from "./constants";
import type { UploadedFile } from "./types";

// Única función de subida de archivos de toda la aplicación (campañas,
// solicitudes, carga masiva, diseños finales, modificaciones):
// docs/09-matriz-paridad-funcional.md § "Arquitectura de subida de
// archivos" (2026-08-04). Sube directamente desde el navegador a Supabase
// Storage con el cliente del propio usuario — misma sesión/RLS que antes
// usaban los Server Actions para subir, así que los permisos no cambian —
// de modo que el binario nunca atraviesa el servidor de Next.js: esa
// travesía por un Server Action era la causa raíz del 413 (su límite de
// 1MB por request se aplica a cualquier invocación, con o sin <form>).
// `carpeta` decide dónde queda organizado el archivo dentro del bucket; el
// nombre incluye timestamp + un sufijo aleatorio para no chocar con otra
// subida simultánea del mismo nombre de archivo.
export async function subirArchivo(file: File, carpeta: string): Promise<UploadedFile> {
  const supabase = createClient();
  const sufijo = Math.random().toString(36).slice(2, 8);
  const path = `${carpeta}/${Date.now()}_${sufijo}_${file.name}`;

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl, nombre: file.name, tipo: file.type, size: file.size };
}

// Borra un archivo ya subido cuando deja de hacer falta (el usuario lo
// quita del formulario antes de guardar). Limpieza best-effort — no
// bloquea la interacción del usuario si falla.
export function borrarArchivoSubido(path: string): void {
  const supabase = createClient();
  void supabase.storage.from(STORAGE_BUCKET).remove([path]);
}
