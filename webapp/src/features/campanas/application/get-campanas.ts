import { createClient } from "@/shared/infrastructure/supabase/server-client";
import type { CampanaListItem } from "../domain/types";

// Réplica de loadAndRenderCampanas() (index.html ~4892-4897).
export async function getCampanas(): Promise<CampanaListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("campanas")
    .select("id, nombre, descripcion, fecha_cierre, activa, catalogos, covers, covers_instrucciones")
    .order("created_at", { ascending: false });
  return data ?? [];
}
