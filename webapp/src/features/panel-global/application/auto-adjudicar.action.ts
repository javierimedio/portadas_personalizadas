"use server";

import { createClient } from "@/shared/infrastructure/supabase/server-client";
import { computeAdjudicaciones, type AdjudicarSolicitud } from "../domain/auto-adjudicar";

// Réplica de autoAdjudicar() (index.html ~4816-4886, CAT-18/PAN-13): solo
// admin/marketing (ya lo garantiza el punto de entrada en la UI, pero se
// revalida aquí). Opera sobre TODAS las solicitudes en en_revision_marketing
// del sistema, sin acotar por campaña — igual que el original, que solo usa
// el nombre de la campaña activa para el texto del diálogo de confirmación,
// no para filtrar qué se adjudica.
export async function autoAdjudicar(): Promise<{ error: string } | { adjudicadas: number; sinOpciones: number }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Sesión no válida." };
  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", userData.user.id).maybeSingle();
  if (!perfil || !["admin", "marketing"].includes(perfil.rol ?? "")) return { error: "Sin permisos." };

  const { data: solicitudesRaw } = await supabase
    .from("solicitudes")
    .select("id, provincia, created_at, solicitud_catalogos(catalogo, portada_personalizada, portada_diseno_propio, portada_elegida, portada_opcion_1, portada_opcion_2, portada_opcion_3)")
    .eq("estado", "en_revision_marketing");

  const solicitudes: AdjudicarSolicitud[] = (solicitudesRaw ?? []).map((s) => ({ ...s, solicitud_catalogos: s.solicitud_catalogos ?? [] }));
  if (!solicitudes.length) return { adjudicadas: 0, sinOpciones: 0 };

  const { adjudicaciones, sinOpciones } = computeAdjudicaciones(solicitudes);

  for (const a of adjudicaciones) {
    await supabase.from("solicitud_catalogos").update({ portada_elegida: a.portadaElegida }).eq("solicitud_id", a.solicitudId).eq("catalogo", a.catalogo);
  }

  return { adjudicadas: adjudicaciones.length, sinOpciones };
}
