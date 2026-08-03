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
