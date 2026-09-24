import type { UploadedFile } from "@/shared/storage/types";

export type ModifEntry = {
  id: string;
  nombre: string;
  size: number;
  estado: "subiendo" | "ok" | "error";
  meta?: UploadedFile;
};

export function agregarEntradas(
  prev: ModifEntry[],
  files: { id: string; nombre: string; size: number }[]
): ModifEntry[] {
  return [...prev, ...files.map((f) => ({ ...f, estado: "subiendo" as const }))];
}

export function marcarOk(prev: ModifEntry[], id: string, meta: UploadedFile): ModifEntry[] {
  return prev.map((e) => (e.id === id ? { ...e, estado: "ok" as const, meta } : e));
}

export function marcarError(prev: ModifEntry[], id: string): ModifEntry[] {
  return prev.map((e) => (e.id === id ? { ...e, estado: "error" as const } : e));
}

export function quitarEntrada(prev: ModifEntry[], id: string): ModifEntry[] {
  return prev.filter((e) => e.id !== id);
}

// Devuelve los UploadedFile de los archivos en estado "ok", listos para enviar.
export function adjuntosParaEnviar(entries: ModifEntry[]): UploadedFile[] {
  return entries.filter((e) => e.estado === "ok").map((e) => e.meta!);
}

// Devuelve los storage paths de los archivos ya subidos, para limpieza best-effort.
export function archivosParaLimpiar(entries: ModifEntry[]): string[] {
  return entries.filter((e) => e.meta != null).map((e) => e.meta!.path);
}

// Construye el texto del log combinando comentario + enlaces de adjuntos.
export function buildAdjuntosTexto(comentario: string, adjuntos: UploadedFile[]): string {
  if (adjuntos.length === 0) return comentario;
  const lineas = adjuntos.map((a) => `📎 Adjunto: [${a.nombre}](${a.url})`).join("\n");
  return `${comentario}\n${lineas}`;
}
