"use server";

import { createClient } from "@/shared/infrastructure/supabase/server-client";

// Réplica de saveNotifPref() en index.html (~5364-5370): guarda al
// instante, sin botón de confirmación (PERF-11). No filtra ningún envío
// real — comportamiento ya documentado en H-03/NOT-12, se mantiene igual.
export async function updateNotifPref(valor: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("perfiles").update({ notif_preferencia: valor }).eq("id", data.user.id);
}
