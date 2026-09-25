export type AdjuntoDisenado = {
  id: string;
  solicitud_id: string;
  catalogo: string | null;
  nombre: string;
  tipo: string;
  storage_path: string | null;
  url: string;
};

// Busca entre los adjuntos existentes si ya hay un diseno_portada con la
// misma identidad (solicitud + catálogo + nombre de archivo). Si existe,
// el nuevo upload debe reemplazarlo en lugar de crear un duplicado.
//
// La identidad NO incluye extensión normalizada: "20037_wrk.pdf" y
// "20037_wrk.ai" son nombres diferentes y no se reemplazan mutuamente.
export function encontrarDisenoAReemplazar(
  existentes: AdjuntoDisenado[],
  nuevo: { solicitud_id: string; catalogo: string; nombre: string }
): AdjuntoDisenado | null {
  return (
    existentes.find(
      (a) =>
        a.tipo === "diseno_portada" &&
        a.solicitud_id === nuevo.solicitud_id &&
        a.catalogo === nuevo.catalogo &&
        a.nombre === nuevo.nombre
    ) ?? null
  );
}
