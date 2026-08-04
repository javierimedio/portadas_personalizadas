"use server";

import { createClient } from "@/shared/infrastructure/supabase/server-client";
import { cambiarEstado } from "@/features/solicitudes/application/detalle-actions";
import { matchCargaFile, type CargaMasivaSolicitud } from "../domain/carga-masiva";

const STORAGE_BUCKET = "portadas-adjuntos";

// Réplica de procesarCargaMasiva() (index.html ~5291-5360): el emparejamiento
// se recalcula aquí contra el estado real en BD (no contra lo que el
// cliente tenía en memoria al abrir el modal), y solo se procesan los
// archivos que resuelven a 'ok'. La notificación por solicitud (CM-08) la
// dispara cambiarEstado() al cambiar el estado — una sola vez por
// solicitud, aunque tenga varios archivos, igual que el original.
export async function procesarCargaMasiva(formData: FormData): Promise<{ ok: number; errors: number } | { error: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Sesión no válida." };
  const { data: perfil } = await supabase.from("perfiles").select("nombre").eq("id", userData.user.id).maybeSingle();

  const files = formData.getAll("files").filter((v): v is File => v instanceof File && v.size > 0);
  if (!files.length) return { ok: 0, errors: 0 };

  const { data: solicitudesRaw } = await supabase
    .from("solicitudes")
    .select("id, cod_sap, nombre_empresa, estado, solicitud_catalogos(catalogo, portada_personalizada)")
    .in("estado", ["en_diseno", "modificar_diseno"]);
  const solicitudes: CargaMasivaSolicitud[] = (solicitudesRaw ?? []).map((s) => ({
    ...s,
    solicitud_catalogos: s.solicitud_catalogos ?? [],
  }));

  const trabajos = files.flatMap((file) => {
    const match = matchCargaFile(file.name, solicitudes);
    return match.status === "ok" ? [{ file, solId: match.solId, catKey: match.catKey }] : [];
  });

  let ok = 0;
  let errors = 0;
  const processedSols = new Set<string>();

  for (const { file, solId, catKey } of trabajos) {
    try {
      const path = `${solId}/diseno/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type || undefined });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

      await supabase.from("adjuntos").insert({
        solicitud_id: solId,
        nombre: file.name,
        url: pub.publicUrl,
        tipo: "diseno_portada",
        catalogo: catKey,
        subido_por: userData.user.id,
        subido_por_nombre: perfil?.nombre,
      });

      if (catKey) {
        await supabase
          .from("solicitud_catalogos")
          .update({ portada_elegida: file.name.replace(/\.[^.]+$/, "") })
          .eq("solicitud_id", solId)
          .eq("catalogo", catKey);
      }

      if (!processedSols.has(solId)) {
        processedSols.add(solId);
        await cambiarEstado(solId, "diseno_en_revision_comercial");
      }
      ok++;
    } catch {
      errors++;
    }
  }

  return { ok, errors };
}
