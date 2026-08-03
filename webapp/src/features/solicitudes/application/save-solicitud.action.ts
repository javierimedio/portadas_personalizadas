"use server";

import { createClient } from "@/shared/infrastructure/supabase/server-client";
import { catalogosDeCampana } from "@/shared/domain/catalogos";
import {
  formatearErrores,
  validateCatalogosParaEnvio,
  validateDatosGenerales,
  type CatalogoFormInput,
} from "../domain/validation";

// Réplica de saveSolicitud() en index.html (~2816-3057) — SOL-01/02/11,
// EST-01 (transición borrador→enviada). Excluye a propósito, por alcance
// acordado para Fase 2 · Bloque 1: subida de adjuntos (~2981-3042) y el
// envío de notificaciones (~3045-3047, enviarNotificacion()) — ambos
// pendientes de bloques posteriores. El resto de transiciones de estado
// (marketing, diseño, confirmar, archivar) se dejan para el bloque 3.
export type SaveSolicitudState = { error?: string; success?: string; solicitudId?: string } | null;

function triState(value: FormDataEntryValue | null): boolean | null {
  if (value === "si") return true;
  if (value === "no") return false;
  return null;
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

  if (intent === "enviada") {
    const catInputs: CatalogoFormInput[] = cats.map((cat) => ({
      key: cat.key,
      label: cat.label,
      hasDisenoProp: cat.hasDisenoProp,
      digital: triState(formData.get(`cat_${cat.key}_digital`)),
      impreso: triState(formData.get(`cat_${cat.key}_impreso`)),
      unidades: Number(formData.get(`cat_${cat.key}_unidades`)) || null,
    }));
    errors.push(...validateCatalogosParaEnvio(catInputs));
  }

  if (errors.length > 0) return { error: formatearErrores(errors) };

  if (!campanaId) return { error: "Selecciona una campaña." };

  if (campana?.fecha_cierre) {
    const cierre = new Date(campana.fecha_cierre);
    cierre.setHours(23, 59, 59);
    if (new Date() > cierre) {
      return { error: `La campaña ${campana.nombre} está cerrada (${campana.fecha_cierre.slice(0, 10)}). Selecciona otra campaña.` };
    }
  }

  if (!solicitudId) {
    // Réplica exacta de la comprobación de duplicados (~2913-2922): compara
    // el código tal como se escribió (sin mayusculizar) contra los ya
    // guardados (que SÍ se guardan en mayúsculas, ~2932) — comprobación
    // sensible a mayúsculas que en la práctica solo protege SAPs numéricos.
    // Documentado como posible hallazgo, se replica tal cual (principio de
    // paridad funcional, docs/00-resumen-ejecutivo.md).
    const { data: dup } = await supabase
      .from("solicitudes")
      .select("id")
      .eq("campana_id", campanaId)
      .eq("cod_sap", codSap)
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
    const catRows = cats.map((cat) => ({
      solicitud_id: solId,
      catalogo: cat.key,
      catalogo_digital: triState(formData.get(`cat_${cat.key}_digital`)),
      catalogo_impreso: triState(formData.get(`cat_${cat.key}_impreso`)),
      portada_diseno_propio: false,
      unidades: Number(formData.get(`cat_${cat.key}_unidades`)) || null,
    }));
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

  return {
    success: intent === "enviada" ? "Solicitud enviada correctamente." : "Borrador guardado.",
    solicitudId: solId ?? undefined,
  };
}
