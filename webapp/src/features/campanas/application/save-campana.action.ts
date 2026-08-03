"use server";

import { createClient } from "@/shared/infrastructure/supabase/server-client";
import { ALL_CATALOGOS } from "@/shared/domain/catalogos";
import { IDIOMAS } from "@/shared/domain/idiomas";

// Réplica de saveCampana()/uploadCoverFiles()/uploadInstrFiles() (index.html
// ~4775-4805, ~5013-5062) — con el cambio funcional solicitado: el PDF de
// instrucciones pasa de ser uno por catálogo a uno por catálogo Y por
// idioma. "Portadas disponibles" (covers) no cambia.
export type SaveCampanaState = { error?: string; success?: string } | null;

const STORAGE_BUCKET = "portadas-adjuntos";

export async function saveCampana(_prev: SaveCampanaState, formData: FormData): Promise<SaveCampanaState> {
  const editId = String(formData.get("editId") ?? "") || null;
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const fechaCierre = String(formData.get("fechaCierre") ?? "") || null;
  const activa = formData.get("activa") === "si";
  const catalogosSelected = formData.getAll("catalogos").map(String);

  if (!nombre) return { error: "El nombre es obligatorio." };
  if (catalogosSelected.length === 0) return { error: "Selecciona al menos un catálogo." };

  const supabase = await createClient();

  const { data: existente } = editId
    ? await supabase.from("campanas").select("covers, covers_instrucciones").eq("id", editId).maybeSingle()
    : { data: null };
  const existingCovers: Record<string, string> = existente?.covers ?? {};
  const existingInstr: Record<string, Record<string, string>> = existente?.covers_instrucciones ?? {};

  // Validación: cada catálogo seleccionado necesita un PDF de portadas y AL
  // MENOS UN idioma con PDF de instrucciones (existente o nuevo) — réplica
  // adaptada de la comprobación original (~5024-5036), que antes bastaba
  // con un único PDF de instrucciones por catálogo.
  const missing: string[] = [];
  for (const key of catalogosSelected) {
    const label = ALL_CATALOGOS.find((c) => c.key === key)?.label ?? key;
    const hasPortada = formData.get(`cover_${key}`) instanceof File && (formData.get(`cover_${key}`) as File).size > 0;
    if (!hasPortada && !existingCovers[key]) missing.push(`${label} (portadas)`);

    const tieneInstrExistente = Object.keys(existingInstr[key] ?? {}).length > 0;
    const tieneInstrNueva = IDIOMAS.some((idioma) => {
      const f = formData.get(`instr_${key}_${idioma}`);
      return f instanceof File && f.size > 0;
    });
    if (!tieneInstrExistente && !tieneInstrNueva) missing.push(`${label} (instrucciones)`);
  }
  if (missing.length > 0) return { error: `Faltan PDFs obligatorios: ${missing.join(", ")}.` };

  const solData = {
    nombre,
    descripcion: descripcion || null,
    fecha_cierre: fechaCierre,
    activa,
    catalogos: catalogosSelected,
  };

  let campanaId = editId;
  if (editId) {
    const { error } = await supabase.from("campanas").update(solData).eq("id", editId);
    if (error) return { error: `Error: ${error.message}` };
  } else {
    const { data, error } = await supabase.from("campanas").insert(solData).select("id").single();
    if (error) return { error: `Error: ${error.message}` };
    campanaId = data.id;
  }

  const covers = { ...existingCovers };
  for (const key of catalogosSelected) {
    const file = formData.get(`cover_${key}`);
    if (!(file instanceof File) || file.size === 0) continue;
    const path = `covers/${campanaId}/${key}_${Date.now()}.pdf`;
    const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: true, contentType: "application/pdf" });
    if (!upErr) {
      const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      covers[key] = pub.publicUrl;
    }
  }

  const coversInstrucciones: Record<string, Record<string, string>> = {};
  for (const key of catalogosSelected) {
    coversInstrucciones[key] = { ...(existingInstr[key] ?? {}) };
    for (const idioma of IDIOMAS) {
      const file = formData.get(`instr_${key}_${idioma}`);
      if (!(file instanceof File) || file.size === 0) continue;
      const path = `instrucciones/${campanaId}/${key}_${idioma}_${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: true, contentType: "application/pdf" });
      if (!upErr) {
        const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        coversInstrucciones[key][idioma] = pub.publicUrl;
      }
    }
  }

  const { error: pdfError } = await supabase
    .from("campanas")
    .update({ covers, covers_instrucciones: coversInstrucciones })
    .eq("id", campanaId);
  if (pdfError) return { error: `Error: ${pdfError.message}` };

  return { success: editId ? "Campaña actualizada." : `Campaña "${nombre}" creada.` };
}
