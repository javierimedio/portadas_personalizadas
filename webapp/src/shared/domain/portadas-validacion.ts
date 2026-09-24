// Patrón de corrupción generado por el bug de la carga masiva legacy
// (index.html:5328): escribía el stem del nombre de archivo directamente
// en portada_elegida. Ejemplos: "25532_roly", "29_wrk", "66732_stm".
export const PORTADA_CORRUPT_RE = /^\d+_(roly|wrk|stm|stamina|xmas)$/i;

export function isPortadaCorrupta(value: string): boolean {
  return PORTADA_CORRUPT_RE.test(value);
}
