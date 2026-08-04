import { createClient } from "@/shared/infrastructure/supabase/server-client";
import type { CampanaListItem } from "../domain/types";

// Réplica de loadAndRenderCampanas() (index.html ~4892-4897), incluido el
// conteo de solicitudes por campaña que usa la tabla (~4907, CAMP-13).
export async function getCampanas(): Promise<CampanaListItem[]> {
  const supabase = await createClient();
  const [{ data: campanasRaw }, { data: solicitudesRaw }] = await Promise.all([
    supabase
      .from("campanas")
      .select("id, nombre, descripcion, fecha_cierre, activa, catalogos, covers, covers_instrucciones")
      .order("created_at", { ascending: false }),
    supabase.from("solicitudes").select("campana_id"),
  ]);

  const conteos = new Map<string, number>();
  for (const s of solicitudesRaw ?? []) {
    if (!s.campana_id) continue;
    conteos.set(s.campana_id, (conteos.get(s.campana_id) ?? 0) + 1);
  }

  return (campanasRaw ?? []).map((c) => ({ ...c, solicitudesCount: conteos.get(c.id) ?? 0 }));
}
