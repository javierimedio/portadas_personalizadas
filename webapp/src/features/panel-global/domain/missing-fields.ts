import { catalogosDeCampana } from "@/shared/domain/catalogos";

export type SolicitudCatalogoLike = {
  catalogo: string;
  catalogo_digital: boolean | null;
  catalogo_impreso: boolean | null;
  portada_personalizada: boolean | null;
  portada_diseno_propio: boolean | null;
  portada_opcion_1: string | null;
  posicion_logo: string | null;
  unidades: number | null;
};

export type SolicitudMissingLike = {
  provincia: string | null;
  idioma: string | null;
  campana_catalogos: string[] | null;
  solicitud_catalogos: SolicitudCatalogoLike[];
};

// Réplica exacta de missingFields() (index.html ~1991-2010, SOL-25/PAN-06):
// usa los catálogos de la CAMPAÑA de esta solicitud, no una lista global.
export function missingFields(sol: SolicitudMissingLike): string[] {
  const missing: string[] = [];
  if (!sol.provincia && (sol.idioma?.toUpperCase() === "ESPAÑOL" || !sol.idioma)) missing.push("Provincia");

  const solCats = catalogosDeCampana(sol.campana_catalogos);
  solCats.forEach((cat) => {
    const c = sol.solicitud_catalogos.find((x) => x.catalogo === cat.key);
    if (!c) return;
    if (c.catalogo_digital === null && c.catalogo_impreso === null) return;

    if (c.catalogo_impreso === null) missing.push(`Cat. imp. ${cat.key}`);
    if (c.catalogo_digital === null) missing.push(`Cat. dig. ${cat.key}`);
    if (c.portada_personalizada && !c.portada_diseno_propio && !c.portada_opcion_1) missing.push(`Portada ${cat.label || cat.key}`);
    if (c.portada_personalizada && !c.portada_diseno_propio && !c.posicion_logo) missing.push(`Pos. logo ${cat.key}`);
    if (c.catalogo_impreso && !c.unidades) missing.push(`Unidades ${cat.key}`);
  });
  return missing;
}
