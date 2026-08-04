"use server";

import { createClient } from "@/shared/infrastructure/supabase/server-client";
import { ALL_CATALOGOS } from "@/shared/domain/catalogos";

// Réplica funcional de saveCampana()/uploadCoverFiles()/uploadInstrFiles()
// (index.html ~4775-4805, ~5013-5062) — con el cambio funcional
// solicitado: el PDF de instrucciones pasa de ser uno por catálogo a uno
// por catálogo Y por idioma, y el conjunto de idiomas no está limitado a
// una lista fija en código — se descubre a partir de los campos que
// realmente llegan en el formulario (`instr_<catalogo>_<idioma>_*`), así
// que añadir un idioma nuevo en el futuro no requiere ningún cambio de
// código, solo escribir su nombre en el formulario de campaña. "Portadas
// disponibles" (covers) no cambia.
//
// Arquitectura de subida (docs/09-matriz-paridad-funcional.md §
// "Arquitectura de subida de archivos", 2026-08-04): los PDFs ya se han
// subido a Storage desde el navegador (`CampanaFileDropZone`, vía
// `shared/storage/upload-client.ts`) antes de que este Server Action se
// ejecute. Aquí solo se leen las rutas/URLs/nombres resultantes — nunca un
// `File` — eliminando el límite de 1MB de Server Actions como origen del
// error 413.
export type SaveCampanaState = { error?: string; success?: string } | null;

function metaField(formData: FormData, base: string): { url: string; nombre: string } | null {
  const url = formData.get(`${base}_url`);
  const nombre = formData.get(`${base}_nombre`);
  if (typeof url !== "string" || !url) return null;
  return { url, nombre: typeof nombre === "string" ? nombre : "" };
}

// Los catálogos son un conjunto cerrado y conocido ('roly', 'roly_wrk', ...),
// pero algunos son prefijo de otros ('roly' de 'roly_wrk') — se comprueba el
// más largo primero para no asignar un campo de 'roly_wrk' a 'roly'.
const CATALOGO_KEYS = ALL_CATALOGOS.map((c) => c.key).sort((a, b) => b.length - a.length);

function parseInstrBase(name: string): { catKey: string; idioma: string } | null {
  if (!name.startsWith("instr_")) return null;
  const rest = name.slice("instr_".length);
  for (const key of CATALOGO_KEYS) {
    if (rest.startsWith(`${key}_`)) {
      return { catKey: key, idioma: rest.slice(key.length + 1) };
    }
  }
  return null;
}

function instrMetaFromForm(formData: FormData): Map<string, { idioma: string; url: string; nombre: string }[]> {
  const result = new Map<string, { idioma: string; url: string; nombre: string }[]>();
  for (const [name] of formData.entries()) {
    if (!name.startsWith("instr_") || !name.endsWith("_url")) continue;
    const base = name.slice(0, -"_url".length);
    const parsed = parseInstrBase(base);
    if (!parsed) continue;
    const meta = metaField(formData, base);
    if (!meta) continue;
    const list = result.get(parsed.catKey) ?? [];
    list.push({ idioma: parsed.idioma, url: meta.url, nombre: meta.nombre });
    result.set(parsed.catKey, list);
  }
  return result;
}

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
  const newInstrMeta = instrMetaFromForm(formData);

  // Validación: cada catálogo seleccionado necesita un PDF de portadas y AL
  // MENOS UN idioma con PDF de instrucciones (existente o nuevo) — réplica
  // adaptada de la comprobación original (~5024-5036), que antes bastaba
  // con un único PDF de instrucciones por catálogo.
  const missing: string[] = [];
  for (const key of catalogosSelected) {
    const label = ALL_CATALOGOS.find((c) => c.key === key)?.label ?? key;
    const hasPortada = Boolean(metaField(formData, `cover_${key}`)) || Boolean(existingCovers[key]);
    if (!hasPortada) missing.push(`${label} (portadas)`);

    const tieneInstrExistente = Object.keys(existingInstr[key] ?? {}).length > 0;
    const tieneInstrNueva = (newInstrMeta.get(key)?.length ?? 0) > 0;
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
    const meta = metaField(formData, `cover_${key}`);
    if (meta) covers[key] = meta.url;
  }

  const coversInstrucciones: Record<string, Record<string, string>> = {};
  for (const key of catalogosSelected) {
    coversInstrucciones[key] = { ...(existingInstr[key] ?? {}) };
    for (const { idioma, url } of newInstrMeta.get(key) ?? []) {
      coversInstrucciones[key][idioma] = url;
    }
  }

  const { error: pdfError } = await supabase
    .from("campanas")
    .update({ covers, covers_instrucciones: coversInstrucciones })
    .eq("id", campanaId);
  if (pdfError) return { error: `Error: ${pdfError.message}` };

  return { success: editId ? "Campaña actualizada." : `Campaña "${nombre}" creada.` };
}
