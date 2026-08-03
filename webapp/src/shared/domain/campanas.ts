// Réplica de getDefaultCampanaId() en index.html (~1615-1628): entre las
// campañas activas, la que tiene la fecha de cierre más lejana (las sin
// fecha cuentan como "más antiguas", no como "sin límite") es la campaña
// por defecto. Concepto transversal (Dashboard, Solicitudes, Diseño lo
// necesitan) — copia independiente de la versión del Dashboard
// (features/dashboard/domain/dashboard-stats.ts) por el mismo motivo que
// shared/domain/catalogos.ts: no arriesgar ese módulo ya validado.
export type CampanaLike = { id: string; activa: boolean; fecha_cierre: string | null };

export function getDefaultCampanaId(campanas: CampanaLike[]): string {
  if (!campanas.length) return "";
  const activas = campanas.filter((c) => c.activa);
  if (!activas.length) return campanas[0]?.id ?? "";
  const sorted = [...activas].sort((a, b) => {
    const da = a.fecha_cierre ? new Date(a.fecha_cierre).getTime() : 0;
    const db = b.fecha_cierre ? new Date(b.fecha_cierre).getTime() : 0;
    return db - da;
  });
  return sorted[0]?.id ?? "";
}
