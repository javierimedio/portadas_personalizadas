export const AGREGAR_ENLACE_ROLES = [
  "comercial_nacional",
  "comercial_exportacion",
  "responsable_nacional",
  "responsable_exportacion",
  "admin",
  "marketing",
] as const;

export function validarEnlace(nombre: string, url: string): string | null {
  const nombreTrimmed = nombre.trim();
  if (!nombreTrimmed) return "El nombre es obligatorio.";
  if (nombreTrimmed.length > 150) return "El nombre no puede superar los 150 caracteres.";

  const urlTrimmed = url.trim();
  if (!urlTrimmed) return "La URL es obligatoria.";
  if (urlTrimmed.length > 2000) return "La URL no puede superar los 2.000 caracteres.";

  let parsed: URL;
  try {
    parsed = new URL(urlTrimmed);
  } catch {
    return "La URL no es válida.";
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "Solo se permiten URLs con protocolo http o https.";
  }

  return null;
}

export function puedeAgregarEnlace(rol: string | null | undefined): boolean {
  return (AGREGAR_ENLACE_ROLES as readonly string[]).includes(rol ?? "");
}

export function puedeEliminarEnlace(
  rol: string | null | undefined,
  subidoPor: string | null | undefined,
  currentUserId: string | null | undefined
): boolean {
  if (rol === "admin" || rol === "marketing") return true;
  if (!(AGREGAR_ENLACE_ROLES as readonly string[]).includes(rol ?? "")) return false;
  return Boolean(subidoPor && currentUserId && subidoPor === currentUserId);
}

export function esEnlaceExterno(tipo: string): boolean {
  return tipo === "enlace_externo";
}
