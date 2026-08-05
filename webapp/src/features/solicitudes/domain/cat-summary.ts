import type { CatalogoDef } from "@/shared/domain/catalogos";

// Réplica de catSummary() en index.html (~1980-1989). Devuelve datos, no
// HTML — el componente decide cómo pintarlo (SOL-24).
export type SolicitudCatalogoLike = {
  catalogo_digital: boolean | null;
  catalogo_impreso: boolean | null;
  unidades: number | null;
  portada_personalizada: boolean | null;
  portada_diseno_propio: boolean | null;
  portada_opcion_1: string | null;
};

export type CatSummary =
  | { variant: "empty" }
  | { variant: "no" }
  | { variant: "summary"; unidades: number | null; portadaLabel: string | null; chipColor: string };

export function catSummary(catalogo: SolicitudCatalogoLike | undefined, catDef: CatalogoDef): CatSummary {
  if (!catalogo) return { variant: "empty" };
  if (catalogo.catalogo_impreso === null && catalogo.catalogo_digital === null) return { variant: "empty" };
  if (!catalogo.catalogo_impreso && !catalogo.catalogo_digital) return { variant: "no" };

  const portadaLabel = catalogo.portada_personalizada
    ? catalogo.portada_diseno_propio
      ? "Propio"
      : catalogo.portada_opcion_1 || "?"
    : null;

  return { variant: "summary", unidades: catalogo.unidades, portadaLabel, chipColor: catDef.color };
}
