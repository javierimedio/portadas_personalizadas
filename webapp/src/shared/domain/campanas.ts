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

// Réplica de la comprobación de cierre repetida en checkCampanaAndOpen()
// (~2663-2666) y saveSolicitud() (~2856-2861): una campaña cierra al final
// del día de su fecha_cierre (23:59:59), no a las 00:00.
export function campanaCerrada(fechaCierre: string | null): boolean {
  if (!fechaCierre) return false;
  const cierre = new Date(fechaCierre);
  cierre.setHours(23, 59, 59);
  return new Date() > cierre;
}

// Réplica de `activeCampana` (index.html ~1610, ~5067-5074, CAMP-01/CAMP-05):
// concepto DISTINTO del flag `activa` de la campaña (CAMP-04) — es una
// selección de sesión, no persistida en BD, que "Usar como activa" puede
// fijar explícitamente a cualquier campaña activa. Aquí se replica con una
// cookie (mismo patrón que la impersonación de rol), así que esta función
// solo decide: si la cookie apunta a una campaña que sigue activa, se
// respeta; si no (nunca se fijó, o la campaña ya no es activa/se borró), se
// recalcula el valor por defecto.
export function activeCampanaId(campanas: CampanaLike[], overrideId: string | null | undefined): string {
  if (overrideId && campanas.some((c) => c.id === overrideId && c.activa)) return overrideId;
  return getDefaultCampanaId(campanas);
}

export type CampanaBanner = { variant: "cerrada" | "porcerrar"; mensaje: string };

// Réplica de renderCampanaBanner() (~2366-2393, CAMP-03): rojo si la
// campaña activa ya cerró, ámbar si cierra en 7 días o menos, nada en el
// resto de casos.
export function campanaBanner(campana: { nombre: string; fecha_cierre: string | null } | null | undefined): CampanaBanner | null {
  if (!campana?.fecha_cierre) return null;
  const cierre = new Date(campana.fecha_cierre);
  cierre.setHours(23, 59, 59);
  const hoy = new Date();

  if (hoy > cierre) {
    return { variant: "cerrada", mensaje: `Campaña cerrada. ${campana.nombre} cerró el ${campana.fecha_cierre.slice(0, 10)}.` };
  }
  const diasRestantes = Math.ceil((cierre.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  if (diasRestantes <= 7) {
    return {
      variant: "porcerrar",
      mensaje: `La campaña ${campana.nombre} cierra en ${diasRestantes} día${diasRestantes !== 1 ? "s" : ""}. Fecha de cierre: ${campana.fecha_cierre.slice(0, 10)}.`,
    };
  }
  return null;
}
