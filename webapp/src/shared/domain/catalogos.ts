// Réplica de ALL_CATS en index.html (~1648-1653) — catálogo con su color y
// si tiene "Diseño 100% propio" (solo Stamina/XMAS, CAT-02). Concepto
// transversal (Solicitudes, Campañas, Diseño lo usan), por eso vive en
// shared/ y no dentro de una sola feature. El Dashboard tiene su propia
// versión mínima (features/dashboard/domain/dashboard-stats.ts) con solo
// key/label porque no necesita color ni hasDisenoProp — no se ha fusionado
// con esta a propósito, para no arriesgar el módulo ya validado.
export type CatalogoDef = {
  key: "roly" | "roly_wrk" | "stamina" | "xmas";
  label: string;
  color: string;
  hasDisenoProp: boolean;
};

export const ALL_CATALOGOS: CatalogoDef[] = [
  { key: "roly", label: "ROLY", color: "var(--c-blue)", hasDisenoProp: false },
  { key: "roly_wrk", label: "ROLY WRK", color: "var(--c-teal)", hasDisenoProp: false },
  { key: "stamina", label: "STAMINA", color: "#6B7280", hasDisenoProp: true },
  { key: "xmas", label: "XMAS", color: "#E30613", hasDisenoProp: true },
];

// Réplica de updateCatsForCampana()/getCatsForCampana() (~1855-1864): el
// fallback de "campaña sin lista propia" es solo los 3 catálogos
// históricos, nunca los 4 (a diferencia del fallback del Dashboard cuando
// no hay campaña seleccionada, que sí es los 4 — son dos defaults
// distintos en el original, no el mismo).
export function catalogosDeCampana(catalogos: string[] | null | undefined): CatalogoDef[] {
  const keys = catalogos || ["roly", "roly_wrk", "stamina"];
  return ALL_CATALOGOS.filter((c) => keys.includes(c.key));
}
