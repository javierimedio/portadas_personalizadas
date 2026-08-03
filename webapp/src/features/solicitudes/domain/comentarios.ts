// Réplica funcional de la detección de menciones de addComentario()/
// renderLogEntry() (index.html ~3365-3376, ~3235-3245): un @ seguido de una
// palabra. El original usaba una expresión con cuantificador perezoso que
// incluía espacios en la clase de caracteres — en la práctica nunca llega a
// capturar más de la primera palabra, porque la condición de parada
// (lookahead de espacio) se cumple en el primer espacio antes de que el
// cuantificador perezoso necesite consumirlo. Aquí se usa una mención de
// una sola palabra sin esa trampa; `perfilesMencionados` ya hace coincidir
// por subcadena contra nombre/email, así que "@Ana" sigue encontrando a
// "Ana García".
const MENTION_RE = /@([\wáéíóúüñÁÉÍÓÚÜÑ]+)/g;

export function extractMentionNames(texto: string): string[] {
  return [...texto.matchAll(MENTION_RE)]
    .map((m) => m[1])
    .filter((s): s is string => Boolean(s));
}

export function perfilesMencionados<T extends { nombre: string; email: string }>(texto: string, perfiles: T[]): T[] {
  const menciones = extractMentionNames(texto).map((m) => m.toLowerCase());
  return perfiles.filter((p) => menciones.some((m) => p.nombre.toLowerCase().includes(m) || p.email.toLowerCase().includes(m)));
}

// Para renderizar el resaltado sin dangerouslySetInnerHTML: se devuelven
// segmentos de texto normal o de mención para que el componente decida
// cómo pintarlos.
export type ComentarioSegmento = { texto: string; mencion: boolean };

export function segmentarComentario(texto: string): ComentarioSegmento[] {
  const segmentos: ComentarioSegmento[] = [];
  let ultimo = 0;
  for (const match of texto.matchAll(MENTION_RE)) {
    const inicio = match.index ?? 0;
    if (inicio > ultimo) segmentos.push({ texto: texto.slice(ultimo, inicio), mencion: false });
    segmentos.push({ texto: match[0], mencion: true });
    ultimo = inicio + match[0].length;
  }
  if (ultimo < texto.length) segmentos.push({ texto: texto.slice(ultimo), mencion: false });
  return segmentos;
}
