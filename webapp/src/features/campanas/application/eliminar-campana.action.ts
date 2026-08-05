"use server";

import { createClient } from "@/shared/infrastructure/supabase/server-client";

// Réplica de eliminarCampana() (index.html ~5076-5098, CAMP-13): borrado
// manual en cascada de cada solicitud de la campaña (mismo orden que
// eliminarSolicitud() en detalle-actions.ts) y, al final, de la propia
// campaña. RLS ya decide si el usuario puede borrar cada fila
// (docs/03-modelo-datos.md § 3.5) — esta acción solo es alcanzable desde
// admin/marketing (nav-items.ts), que sí pueden en cualquier estado.
export async function eliminarCampana(campanaId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Sesión no válida." };

  const { data: solicitudes } = await supabase.from("solicitudes").select("id").eq("campana_id", campanaId);
  for (const s of solicitudes ?? []) {
    await supabase.from("solicitud_catalogos").delete().eq("solicitud_id", s.id);
    await supabase.from("adjuntos").delete().eq("solicitud_id", s.id);
    await supabase.from("logs").delete().eq("solicitud_id", s.id);
    await supabase.from("notificaciones").delete().eq("solicitud_id", s.id);
    await supabase.from("solicitudes").delete().eq("id", s.id);
  }

  const { error } = await supabase.from("campanas").delete().eq("id", campanaId);
  if (error) return { error: `Error: ${error.message}` };
  return {};
}
