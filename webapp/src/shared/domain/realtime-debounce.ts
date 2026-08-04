// Réplica de la comprobación de debounce repetida en initRealtime()/
// startPolling() (index.html ~4630-4631, ~4729-4731, UI-16): ambos disparan
// un refresco, pero comparten el mismo temporizador — si uno acaba de
// refrescar, el otro se ignora durante `debounceMs`.
export function debeActualizar(lastUpdate: number, now: number, debounceMs = 2000): boolean {
  return now - lastUpdate >= debounceMs;
}
