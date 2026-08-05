// Réplica de ESTADO_LABEL en index.html (~1657-1666). Concepto transversal
// (Solicitudes, Diseño, Panel global lo necesitan) — copia independiente de
// la versión del Dashboard (features/dashboard/domain/dashboard-stats.ts)
// por el mismo motivo que shared/domain/catalogos.ts: no arriesgar ese
// módulo ya validado. No incluye 'diseno_en_revision' (sin sufijo): valor
// de enum inerte, confirmado en docs/03-modelo-datos.md § 3.4.2.
export const ESTADO_LABEL: Record<string, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  en_revision_marketing: "En revisión",
  en_diseno: "En diseño",
  diseno_en_revision_comercial: "Revisión cliente",
  modificar_diseno: "Modificar diseño",
  confirmada: "Confirmada",
  archivada: "Archivada",
};
