"use server";

import { createClient } from "@/shared/infrastructure/supabase/server-client";
import type { NotificacionItem } from "../domain/panel";

// Réplica de loadNotifications() (index.html ~5391-5402): ventana de 7 días,
// tope de 30 registros, filtrado por el email del usuario actual — RLS
// (notificaciones_select) ya lo garantiza, pero se replica el mismo filtro
// explícito por fidelidad y para no depender solo de RLS.
export async function getNotificaciones(): Promise<NotificacionItem[]> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.email) return [];

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("notificaciones")
    .select("id, solicitud_id, asunto, cuerpo, created_at")
    .eq("destinatario", userData.user.email)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(30);

  return data ?? [];
}
