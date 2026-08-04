"use server";

import { createClient } from "@/shared/infrastructure/supabase/server-client";
import { catalogosDeCampana } from "@/shared/domain/catalogos";
import { campanaCerrada } from "@/shared/domain/campanas";
import { enviarNotificacion } from "@/features/notificaciones/application/enviar-notificacion";
import {
  formatearErrores,
  validateCatalogosParaEnvio,
  validateDatosGenerales,
  type CatalogoFormInput,
} from "../domain/validation";

// Réplica funcional de saveSolicitud() en index.html (~2816-3057) —
// SOL-01/02/11, CAT-01 a CAT-16, EST-01 (transición borrador→enviada), con
// las correcciones de docs/09-matriz-paridad-funcional.md § H-09/H-10: el
// SAP duplicado se compara sin distinguir mayúsculas, y "Diseño 100%
// propio" es independiente por catálogo (Stamina y XMAS ya no comparten
// estado).
export type SaveSolicitudState = { error?: string; success?: string; solicitudId?: string } | null;

const STORAGE_BUCKET = "portadas-adjuntos";

function triState(value: FormDataEntryValue | null): boolean | null {
  if (value === "si") return true;
  if (value === "no") return false;
  return null;
}

function filesFrom(formData: FormData, key: string): File[] {
  return formData
    .getAll(key)
    .filter((v): v is File => v instanceof File && v.size > 0);
}

export async function saveSolicitud(_prev: SaveSolicitudState, formData: FormData): Promise<SaveSolicitudState> {
  const intent = String(formData.get("intent") ?? "borrador") as "borrador" | "enviada";
  const solicitudId = String(formData.get("solicitudId") ?? "") || null;

  const codSap = String(formData.get("codSap") ?? "").trim();
  const nombreEmpresa = String(formData.get("nombreEmpresa") ?? "").trim();
  const idioma = String(formData.get("idioma") ?? "");
  const provincia = (
    idioma === "Español" ? String(formData.get("provinciaSelect") ?? "") : String(formData.get("provinciaInput") ?? "")
  ).trim();
  const comentarios = String(formData.get("comentarios") ?? "").trim();
  const campanaId = String(formData.get("campanaId") ?? "");
  const canal = String(formData.get("canal") ?? "") || null;
  const comercialAsignado = String(formData.get("comercialAsignado") ?? "") || null;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Sesión no válida." };

  const { data: perfil } = await supabase.from("perfiles").select("rol, nombre").eq("id", userData.user.id).maybeSingle();

  const errors = validateDatosGenerales({ codSap, idioma, provincia });

  // La lista de catálogos a validar/guardar depende de la campaña elegida
  // en el formulario, no de una lista global fija (~2854-2855, ~2949-2951).
  const { data: campana } = campanaId
    ? await supabase.from("campanas").select("id, nombre, fecha_cierre, catalogos").eq("id", campanaId).maybeSingle()
    : { data: null };
  const cats = catalogosDeCampana(campana?.catalogos ?? null);

  function readCat(cat: (typeof cats)[number]) {
    return {
      portadaPersonalizada: triState(formData.get(`cat_${cat.key}_portadaPersonalizada`)),
      digital: triState(formData.get(`cat_${cat.key}_digital`)),
      impreso: triState(formData.get(`cat_${cat.key}_impreso`)),
      unidades: Number(formData.get(`cat_${cat.key}_unidades`)) || null,
      conPrecios: cat.hasDisenoProp ? triState(formData.get(`cat_${cat.key}_conPrecios`)) : null,
      disenoPropio: cat.hasDisenoProp ? triState(formData.get(`cat_${cat.key}_disenoPropio`)) === true : false,
      opcion1: String(formData.get(`cat_${cat.key}_opcion1`) ?? "") || null,
      opcion2: String(formData.get(`cat_${cat.key}_opcion2`) ?? "") || null,
      opcion3: String(formData.get(`cat_${cat.key}_opcion3`) ?? "") || null,
      posicionLogo: String(formData.get(`cat_${cat.key}_posicionLogo`) ?? "") || null,
    };
  }

  if (intent === "enviada") {
    const catInputs: CatalogoFormInput[] = cats.map((cat) => {
      const c = readCat(cat);
      return { key: cat.key, label: cat.label, hasDisenoProp: cat.hasDisenoProp, ...c };
    });
    errors.push(...validateCatalogosParaEnvio(catInputs));
  }

  if (errors.length > 0) return { error: formatearErrores(errors) };

  if (!campanaId) return { error: "Selecciona una campaña." };

  if (campanaCerrada(campana?.fecha_cierre ?? null)) {
    return { error: `La campaña ${campana?.nombre} está cerrada (${campana?.fecha_cierre?.slice(0, 10)}). Selecciona otra campaña.` };
  }

  if (!solicitudId) {
    // Comprobación de duplicados (~2913-2922) comparando en mayúsculas en
    // ambos lados — el original comparaba el código sin mayusculizar
    // contra los ya guardados (que sí se guardan en mayúsculas), lo que en
    // la práctica solo protegía SAPs numéricos (docs/09-matriz-paridad-
    // funcional.md § H-09, corregido).
    const codSapUpper = codSap.toUpperCase();
    const { data: dup } = await supabase
      .from("solicitudes")
      .select("id")
      .eq("campana_id", campanaId)
      .eq("cod_sap", codSapUpper)
      .maybeSingle();
    if (dup) {
      return { error: `El cliente ${codSap} ya tiene una solicitud en la campaña ${campana?.nombre ?? ""}. No se pueden crear duplicados.` };
    }
  }

  const esGestor = perfil?.rol === "admin" || perfil?.rol === "marketing";
  const solData = {
    campana_id: campanaId,
    comercial_id: esGestor && comercialAsignado ? comercialAsignado : userData.user.id,
    canal: esGestor ? canal : null,
    idioma: idioma.toUpperCase(),
    cod_sap: codSap.toUpperCase(),
    nombre_empresa: nombreEmpresa.toUpperCase(),
    provincia: provincia.toUpperCase(),
    comentarios,
    estado: intent,
    ...(intent === "enviada" ? { enviada_at: new Date().toISOString() } : {}),
  };

  let solId = solicitudId;
  if (solicitudId) {
    const { error } = await supabase.from("solicitudes").update(solData).eq("id", solicitudId);
    if (error) return { error: `Error: ${error.message}` };
  } else {
    const { data, error } = await supabase.from("solicitudes").insert(solData).select("id").single();
    if (error) return { error: `Error: ${error.message}` };
    solId = data.id;
  }

  if (cats.length > 0 && solId) {
    const catRows = cats.map((cat) => {
      const c = readCat(cat);
      return {
        solicitud_id: solId,
        catalogo: cat.key,
        catalogo_digital: c.digital,
        catalogo_impreso: c.impreso,
        portada_personalizada: c.portadaPersonalizada,
        portada_diseno_propio: c.disenoPropio,
        con_precios: c.conPrecios,
        portada_opcion_1: c.opcion1,
        portada_opcion_2: c.opcion2,
        portada_opcion_3: c.opcion3,
        posicion_logo: c.posicionLogo,
        unidades: c.unidades,
      };
    });
    const { error } = await supabase.from("solicitud_catalogos").upsert(catRows, { onConflict: "solicitud_id,catalogo" });
    if (error) return { error: `Error: ${error.message}` };
  }

  await supabase.from("logs").insert({
    solicitud_id: solId,
    usuario_id: userData.user.id,
    usuario_nombre: perfil?.nombre,
    accion: solicitudId ? "edicion" : "creacion",
    detalle: { estado: intent, cod_sap: codSap },
  });

  // Subida de adjuntos (~2981-3042): logo del cliente y diseño de portada
  // propio — ahora simétrico para cualquier catálogo con `hasDisenoProp`
  // (Stamina y XMAS), no solo Stamina (docs/09-matriz-paridad-funcional.md
  // § H-10, corregido).
  const filesToUpload: { file: File; tipo: string }[] = [
    ...filesFrom(formData, "logoGeneralFiles").map((file) => ({ file, tipo: "logo_general" })),
    ...cats
      .filter((cat) => cat.hasDisenoProp)
      .flatMap((cat) => filesFrom(formData, `cat_${cat.key}_disenoFiles`).map((file) => ({ file, tipo: `${cat.key}_diseno` }))),
  ];

  for (const entry of filesToUpload) {
    const path = `${solId}/${entry.tipo}/${Date.now()}_${entry.file.name}`;
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, entry.file, { upsert: true, contentType: entry.file.type || undefined });
    if (uploadError) continue;
    const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    await supabase.from("adjuntos").insert({
      solicitud_id: solId,
      nombre: entry.file.name,
      tipo: entry.tipo,
      url: pub.publicUrl,
      subido_por: userData.user.id,
      subido_por_nombre: perfil?.nombre,
    });
    await supabase.from("logs").insert({
      solicitud_id: solId,
      usuario_id: userData.user.id,
      usuario_nombre: perfil?.nombre,
      accion: "adjunto",
      detalle: { nombre: entry.file.name, tipo: entry.tipo, url: pub.publicUrl },
    });
  }

  // Réplica de ~3044-3047: solo se notifica al enviar, nunca al guardar
  // como borrador — cubre tanto la creación como la resubmisión de una
  // solicitud ya existente que estaba en borrador.
  if (intent === "enviada" && solId) await enviarNotificacion(supabase, solId, "enviada");

  // Réplica de ~3053-3057: el toast final de "enviada" incluye el número
  // de archivos adjuntados (contados sobre los seleccionados, no solo los
  // subidos con éxito — igual que el original).
  const sufijoAdjuntos = filesToUpload.length > 0 ? ` ${filesToUpload.length} archivo(s) adjuntado(s).` : "";
  return {
    success:
      intent === "enviada" ? `Solicitud enviada correctamente.${sufijoAdjuntos}` : "Borrador guardado.",
    solicitudId: solId ?? undefined,
  };
}
