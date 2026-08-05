// Lista fija copiada literalmente del <select id="f-idioma"> de index.html
// (~1039-1065): 24 idiomas, Español primero y el resto alfabético.
// Transversal (Solicitudes y, desde el cambio de instrucciones por idioma,
// también Campañas) — vive en shared/ por eso, no dentro de una sola
// feature.
export const IDIOMAS = [
  "Español",
  "Alemán",
  "Búlgaro",
  "Checo",
  "Croata",
  "Danés",
  "Eslovaco",
  "Esloveno",
  "Estonio",
  "Finlandés",
  "Francés",
  "Griego",
  "Holandés",
  "Húngaro",
  "Inglés",
  "Italiano",
  "Letón",
  "Lituano",
  "Macedonio",
  "Polaco",
  "Portugués",
  "Rumano",
  "Ruso",
  "Ucraniano",
] as const;

// Desarrollo funcional nuevo (2026-08-04, a petición del propietario del
// proyecto): de los 24 idiomas de `IDIOMAS`, solo estos 7 tienen un PDF de
// instrucciones propio por catálogo — el resto usa automáticamente el de
// Inglés, sin subir ni duplicar ningún PDF adicional por idioma. Esta lista
// decide tanto qué idiomas puede gestionar el formulario de campaña
// (`CampanaForm`) como a qué idioma cae el fallback en cualquier punto que
// consulte instrucciones (`resolverInstruccionesUrl`).
export const IDIOMAS_CON_INSTRUCCIONES_PROPIAS = ["Alemán", "Inglés", "Español", "Francés", "Italiano", "Polaco", "Rumano"] as const;

export const IDIOMA_INSTRUCCIONES_FALLBACK = "Inglés";

// Único punto de consulta de instrucciones por idioma de toda la
// aplicación: si el idioma de la solicitud no es uno de los 7 con PDF
// propio, resuelve automáticamente al de `IDIOMA_INSTRUCCIONES_FALLBACK`.
export function resolverInstruccionesUrl(
  coversInstrucciones: Record<string, Record<string, string>> | null | undefined,
  catalogo: string,
  idioma: string | null | undefined
): string | undefined {
  if (!idioma) return undefined;
  const idiomaConDocumento = (IDIOMAS_CON_INSTRUCCIONES_PROPIAS as readonly string[]).includes(idioma)
    ? idioma
    : IDIOMA_INSTRUCCIONES_FALLBACK;
  return coversInstrucciones?.[catalogo]?.[idiomaConDocumento];
}
