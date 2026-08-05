// Réplica de fmtDate() en index.html (~4029-4033): dd/mm/yyyy hh:mm en
// es-ES. UI-04 — sin consumidor real hasta este bloque (Solicitudes es el
// primero en mostrar una fecha), así que no se construyó antes.
export function fmtDate(ts: string | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const fecha = d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  const hora = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return `${fecha} ${hora}`;
}

// Varios campos (idioma, provincia) se guardan en mayúsculas por
// normalización de negocio; al reeditar hay que encontrar la opción real
// de la lista (con su capitalización original) sin distinguir
// mayúsculas/minúsculas para poder preseleccionarla en un <select>
// (docs/09-matriz-paridad-funcional.md § H-08).
export function matchOptionCaseInsensitive(list: readonly string[], stored: string | null | undefined): string {
  if (!stored) return "";
  return list.find((o) => o.toLowerCase() === stored.toLowerCase()) ?? stored;
}
