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
// Solo se consideran adjuntos con `catalogo` explícito. Tanto la carga
// masiva como la subida individual desde el modal persisten el catálogo
// en cada adjunto, por lo que la comprobación es siempre determinista.
export function portadasObligatoriasPendientes(
  catalogos: CatalogoParaValidar[],
  adjuntos: AdjuntoParaValidar[]
): string[] {
  const requeridos = catalogos.filter(
    (c) => c.portada_personalizada === true && c.portada_diseno_propio === false
  );

  if (requeridos.length === 0) return [];

  const cubiertos = new Set(
    adjuntos
      .filter((a) => a.tipo === "diseno_portada" && a.catalogo !== null)
      .map((a) => a.catalogo!)
  );

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
