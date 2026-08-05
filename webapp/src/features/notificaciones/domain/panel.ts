// Réplica de updateNotifBadge()/renderNotifPanel() (index.html ~5404-5470):
// el estado de lectura vive fuera (localStorage, NOT-14) — estas funciones
// solo combinan notificaciones + un set de IDs leídos.
export type NotificacionItem = { id: string; solicitud_id: string | null; asunto: string; cuerpo: string; created_at: string };

export function contarNoLeidas(notifs: NotificacionItem[], readIds: Set<string>): number {
  return notifs.filter((n) => !readIds.has(n.id)).length;
}

// Réplica del tope visual "9+" del badge (~5409).
export function badgeTexto(unread: number): string {
  return unread > 9 ? "9+" : String(unread);
}

// Réplica del truncado a 80 caracteres del cuerpo en el listado (~5462).
export function truncarCuerpo(cuerpo: string, max = 80): string {
  return (cuerpo || "").substring(0, max);
}
