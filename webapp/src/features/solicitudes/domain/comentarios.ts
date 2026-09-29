// MENTION_RE: usado SOLO por extractMentionNames() y segmentarComentario()
// para el resaltado visual — captura un token de una sola palabra a efectos
// de display. La resolución de destinatarios reales usa perfilesMencionados(),
// que compara contra el nombre completo del perfil (incluidos espacios), lo
// que evita falsos positivos cuando dos perfiles comparten la misma primera
// palabra (p. ej. "Marta Saura Pastor" vs "Marta Bracalante").
const MENTION_RE = /@([\wáéíóúüñÁÉÍÓÚÜÑ]+)/g;

export function extractMentionNames(texto: string): string[] {
  return [...texto.matchAll(MENTION_RE)]
    .map((m) => m[1])
    .filter((s): s is string => Boolean(s));
}

// Devuelve true si `rest` (texto ya en minúsculas) empieza exactamente con
// `token` (también en minúsculas) y el carácter que sigue —si existe— no es
// una letra (para que "Marta Saura Pastor" no colisione con "Marta Saura
// Pastoriza"). Espacios, puntuación y fin de cadena son delimitadores válidos.
function matchesAt(rest: string, token: string): boolean {
  if (!rest.startsWith(token)) return false;
  const after = rest[token.length];
  return after === undefined || !/[a-záéíóúüñ]/.test(after);
}

// Resuelve qué perfiles están mencionados en `texto` buscando, en cada
// posición @, el nombre completo (o email) de algún perfil conocido.
// Prioriza los nombres más largos para que "Marta Saura Pastor" gane sobre
// un hipotético "Marta Saura" cuando ambos existen. Solo hace coincidencia
// exacta de nombre completo — nunca por subcadena parcial — para evitar
// falsos positivos (bug original: "@Marta Saura Pastor" resolvía tanto a
// "Marta Saura Pastor" como a "Marta Bracalante" porque extractMentionNames
// solo capturaba "Marta" y el filter usaba includes()).
export function perfilesMencionados<T extends { nombre: string; email: string }>(texto: string, perfiles: T[]): T[] {
  const lower = texto.toLowerCase();
  const sorted = [...perfiles].sort((a, b) => b.nombre.length - a.nombre.length);
  const matched = new Set<T>();

  let pos = 0;
  while ((pos = lower.indexOf("@", pos)) !== -1) {
    const rest = lower.slice(pos + 1);
    for (const p of sorted) {
      if (matchesAt(rest, p.nombre.toLowerCase()) || matchesAt(rest, p.email.toLowerCase())) {
        matched.add(p);
        break;
      }
    }
    pos++;
  }
  return [...matched];
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

// ── Segmentación completa: menciones + URLs ────────────────────────────────

export type TextoSegmento =
  | { tipo: "texto"; texto: string }
  | { tipo: "mencion"; texto: string }
  | { tipo: "url"; texto: string; href: string };

// Strips trailing punctuation that almost certainly doesn't belong to the URL.
function stripTrailingPunct(url: string): string {
  return url.replace(/[.,!?;:)}\]>'"]+$/, "");
}

function segmentarPorUrls(texto: string): TextoSegmento[] {
  const segmentos: TextoSegmento[] = [];
  const re = /https?:\/\/[^\s<>"']+/g;
  let ultimo = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(texto)) !== null) {
    const inicio = match.index;
    const urlRaw = match[0];
    const href = stripTrailingPunct(urlRaw);
    const finRaw = inicio + urlRaw.length;
    const finHref = inicio + href.length;
    if (inicio > ultimo) segmentos.push({ tipo: "texto", texto: texto.slice(ultimo, inicio) });
    segmentos.push({ tipo: "url", texto: href, href });
    if (finHref < finRaw) segmentos.push({ tipo: "texto", texto: texto.slice(finHref, finRaw) });
    ultimo = finRaw;
  }
  if (ultimo < texto.length) segmentos.push({ tipo: "texto", texto: texto.slice(ultimo) });
  return segmentos;
}

// Combina detección de menciones y URLs en una sola pasada de segmentos.
// El texto del comentario se divide por menciones primero; los segmentos de
// texto plano se subdividen a su vez por URLs. No usa dangerouslySetInnerHTML:
// devuelve datos estructurados para que el componente los renderice como JSX.
export function segmentarTextoCompleto(texto: string): TextoSegmento[] {
  const porMenciones = segmentarComentario(texto);
  const resultado: TextoSegmento[] = [];
  for (const seg of porMenciones) {
    if (seg.mencion) {
      resultado.push({ tipo: "mencion", texto: seg.texto });
    } else {
      resultado.push(...segmentarPorUrls(seg.texto));
    }
  }
  return resultado;
}
