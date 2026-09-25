import { ALL_CATALOGOS } from "@/shared/domain/catalogos";

export type CatalogoParaValidar = {
  catalogo: string;
  portada_personalizada: boolean | null;
  portada_diseno_propio: boolean | null;
};

export type AdjuntoParaValidar = {
  tipo: string;
  catalogo: string | null;
};

// Devuelve los labels de los catálogos que requieren un diseño de portada
// pero aún no tienen ninguno subido. Un catálogo requiere diseño cuando:
//   portada_personalizada = true  AND  portada_diseno_propio = false
//
// La carga masiva almacena `catalogo` por adjunto (puede validarse por
// catálogo). La subida individual desde el modal no rastrea por catálogo
// (catalogo = null); en ese caso se asume que el diseñador subió todos
// los archivos necesarios y no se bloquea.
export function portadasObligatoriasPendientes(
  catalogos: CatalogoParaValidar[],
  adjuntos: AdjuntoParaValidar[]
): string[] {
  const requeridos = catalogos.filter(
    (c) => c.portada_personalizada === true && c.portada_diseno_propio === false
  );

  if (requeridos.length === 0) return [];

  const disenoAdjs = adjuntos.filter((a) => a.tipo === "diseno_portada");

  // Subida individual: catalogo = null → no hay trazabilidad por catálogo,
  // se confía en que el diseñador subió todo lo necesario.
  if (disenoAdjs.some((a) => a.catalogo === null)) return [];

  const cubiertos = new Set(disenoAdjs.map((a) => a.catalogo).filter(Boolean) as string[]);

  return requeridos
    .filter((c) => !cubiertos.has(c.catalogo))
    .map((c) => ALL_CATALOGOS.find((d) => d.key === c.catalogo)?.label ?? c.catalogo.toUpperCase());
}

export function mensajePortadasPendientes(faltantes: string[]): string {
  if (faltantes.length === 0) return "";
  if (faltantes.length === 1) {
    return `No puedes enviar esta solicitud al comercial porque falta la portada de ${faltantes[0]}.`;
  }
  return `No puedes enviar esta solicitud al comercial porque faltan estas portadas:\n• ${faltantes.join("\n• ")}`;
}
