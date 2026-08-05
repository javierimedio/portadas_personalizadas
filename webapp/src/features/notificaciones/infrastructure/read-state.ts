// Réplica de getReadIds()/markReadId() (index.html ~5375-5384): el estado de
// "leído" vive en localStorage, no en BD (NOT-14, confirmado sin `read_at`
// en docs/03-modelo-datos.md § 3.4.3) — se mantiene así deliberadamente.
const READ_KEY = "portadas_notifs_read";

export function getReadIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

export function markReadId(id: string): void {
  const ids = getReadIds();
  ids.add(id);
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
}

export function markAllRead(ids: string[]): void {
  const readIds = getReadIds();
  ids.forEach((id) => readIds.add(id));
  localStorage.setItem(READ_KEY, JSON.stringify([...readIds]));
}
