export type AdjudicarSolicitud = {
  id: string;
  provincia: string | null;
  created_at: string;
  solicitud_catalogos: {
    catalogo: string;
    portada_personalizada: boolean | null;
    portada_diseno_propio: boolean | null;
    portada_elegida: string | null;
    portada_opcion_1: string | null;
    portada_opcion_2: string | null;
    portada_opcion_3: string | null;
  }[];
};

export type Adjudicacion = { solicitudId: string; catalogo: string; portadaElegida: string };

const CATALOGOS_ADJUDICABLES = ["roly", "roly_wrk", "stamina"];

// Réplica exacta de autoAdjudicar() (index.html ~4816-4886, CAT-18/PAN-13):
// ordena por antigüedad (la más antigua tiene prioridad), asigna la primera
// opción libre por provincia+catálogo evitando repetirla para otro cliente
// de la misma provincia. XMAS queda excluido a propósito — el original
// nunca lo incluye en `cats`. Solo pura selección — la escritura en BD la
// hace el llamador con el resultado.
export function computeAdjudicaciones(solicitudes: AdjudicarSolicitud[]): { adjudicaciones: Adjudicacion[]; sinOpciones: number } {
  const sorted = [...solicitudes].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const usedPortadas = new Map<string, Map<string, Set<string>>>();
  const adjudicaciones: Adjudicacion[] = [];
  let sinOpciones = 0;

  for (const sol of sorted) {
    const provincia = sol.provincia || "SIN_PROVINCIA";
    if (!usedPortadas.has(provincia)) usedPortadas.set(provincia, new Map());
    const porCatalogo = usedPortadas.get(provincia)!;

    for (const catKey of CATALOGOS_ADJUDICABLES) {
      const cat = sol.solicitud_catalogos.find((c) => c.catalogo === catKey);
      if (!cat || !cat.portada_personalizada || cat.portada_diseno_propio) continue;
      if (cat.portada_elegida) continue;

      if (!porCatalogo.has(catKey)) porCatalogo.set(catKey, new Set());
      const used = porCatalogo.get(catKey)!;

      const opciones = [cat.portada_opcion_1, cat.portada_opcion_2, cat.portada_opcion_3].filter((o): o is string => Boolean(o));
      const elegida = opciones.find((o) => !used.has(o));

      if (elegida) {
        used.add(elegida);
        adjudicaciones.push({ solicitudId: sol.id, catalogo: catKey, portadaElegida: elegida });
      } else {
        sinOpciones++;
      }
    }
  }

  return { adjudicaciones, sinOpciones };
}
