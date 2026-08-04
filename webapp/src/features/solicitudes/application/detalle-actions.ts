"use server";

import { createClient } from "@/shared/infrastructure/supabase/server-client";
import { perfilesMencionados } from "../domain/comentarios";
import {
  enviarNotificacion,
  enviarNotificacionAsignacion,
  enviarNotificacionesMencion,
} from "@/features/notificaciones/application/enviar-notificacion";

const STORAGE_BUCKET = "portadas-adjuntos";

async function currentUserAndPerfil() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { supabase, user: null, perfil: null };
  const { data: perfil } = await supabase.from("perfiles").select("rol, nombre").eq("id", userData.user.id).maybeSingle();
  return { supabase, user: userData.user, perfil };
}

// Réplica funcional de cambiarEstadoDirecto() (index.html ~3532-3555),
// incluido el envío de notificación (~3547-3553) — este es el único punto
// central por el que pasan todas las transiciones genéricas de estado
// (enviar a marketing, devolver a borrador, iniciar revisión, enviar a
// diseño sin asignar, "Diseño listo", solicitar modificación, confirmar,
// archivar, carga masiva), así que basta con enviarla aquí una sola vez
// para cubrir NOT-02 a NOT-07 en todos esos casos. El guard anti doble-clic
// del original es un flag en memoria del cliente; aquí basta con comprobar
// el estado real justo antes de escribir — si ya está en el estado
// destino, es un no-op (y no reenvía notificación).
export async function cambiarEstado(solicitudId: string, nuevoEstado: string): Promise<{ error?: string }> {
  const { supabase, user, perfil } = await currentUserAndPerfil();
  if (!user) return { error: "Sesión no válida." };

  const { data: sol } = await supabase.from("solicitudes").select("estado").eq("id", solicitudId).maybeSingle();
  if (!sol) return { error: "Solicitud no encontrada." };
  if (sol.estado === nuevoEstado) return {};

  const { error } = await supabase.from("solicitudes").update({ estado: nuevoEstado }).eq("id", solicitudId);
  if (error) return { error: `Error: ${error.message}` };

  await supabase.from("logs").insert({
    solicitud_id: solicitudId,
    usuario_id: user.id,
    usuario_nombre: perfil?.nombre,
    accion: "cambio_estado",
    detalle: { estado_anterior: sol.estado, estado_nuevo: nuevoEstado },
  });
  await enviarNotificacion(supabase, solicitudId, nuevoEstado);
  return {};
}

// Réplica de eliminarSolicitud() (~3561-3572): borrado manual en cascada —
// RLS ya decide si el usuario puede borrar cada fila (docs/03-modelo-datos.md § 3.5).
export async function eliminarSolicitud(solicitudId: string): Promise<{ error?: string }> {
  const { supabase, user } = await currentUserAndPerfil();
  if (!user) return { error: "Sesión no válida." };

  await supabase.from("solicitud_catalogos").delete().eq("solicitud_id", solicitudId);
  await supabase.from("adjuntos").delete().eq("solicitud_id", solicitudId);
  await supabase.from("logs").delete().eq("solicitud_id", solicitudId);
  await supabase.from("notificaciones").delete().eq("solicitud_id", solicitudId);
  const { error } = await supabase.from("solicitudes").delete().eq("id", solicitudId);
  if (error) return { error: `Error: ${error.message}` };
  return {};
}

// Réplica de saveCanalAssign() (~3670-3678).
export async function asignarCanalYComercial(
  solicitudId: string,
  canal: string,
  comercialId: string
): Promise<{ error?: string }> {
  if (!canal || !comercialId) return { error: "Selecciona canal y comercial." };
  const { supabase } = await currentUserAndPerfil();
  const { error } = await supabase.from("solicitudes").update({ canal, comercial_id: comercialId }).eq("id", solicitudId);
  if (error) return { error: `Error: ${error.message}` };
  return {};
}

// Réplica de confirmAsignar() (~3680-3697): a diferencia de cambiarEstado(),
// esta acción NO dispara el aviso general de "en_diseno" (NOT-03) — solo un
// aviso directo al diseñador recién asignado, exactamente como en el
// original (que hace su propio update+insert, sin pasar por
// cambiarEstadoDirecto).
export async function asignarDisenadorYEnviar(solicitudId: string, disenadorId: string): Promise<{ error?: string }> {
  if (!disenadorId) return { error: "Selecciona un diseñador." };
  const { supabase, user, perfil } = await currentUserAndPerfil();
  if (!user) return { error: "Sesión no válida." };

  const { data: disenador } = await supabase.from("perfiles").select("nombre, email").eq("id", disenadorId).maybeSingle();
  const { error } = await supabase.from("solicitudes").update({ estado: "en_diseno", asignado_id: disenadorId }).eq("id", solicitudId);
  if (error) return { error: `Error: ${error.message}` };

  await supabase.from("logs").insert({
    solicitud_id: solicitudId,
    usuario_id: user.id,
    usuario_nombre: perfil?.nombre,
    accion: "asignacion",
    detalle: { disenador: disenador?.nombre },
  });
  if (disenador?.email) await enviarNotificacionAsignacion(supabase, solicitudId, disenador.email);
  return {};
}

// Réplica de marcarDisenoListo() (~5532-5556): sube los diseños y avanza a
// "Revisión cliente".
export async function marcarDisenoListo(solicitudId: string, formData: FormData): Promise<{ error?: string }> {
  const { supabase, user, perfil } = await currentUserAndPerfil();
  if (!user) return { error: "Sesión no válida." };

  const files = formData.getAll("disenoFiles").filter((v): v is File => v instanceof File && v.size > 0);
  for (const file of files) {
    const path = `${solicitudId}/diseno/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (upErr) continue;
    const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    await supabase.from("adjuntos").insert({
      solicitud_id: solicitudId,
      nombre: file.name,
      tipo: "diseno_portada",
      url: pub.publicUrl,
      subido_por: user.id,
      subido_por_nombre: perfil?.nombre,
    });
  }

  return cambiarEstado(solicitudId, "diseno_en_revision_comercial");
}

// Réplica de enviarModificacion() (~3462-3520), sin el resto de lógica de
// modales del original (aquí ya viene con el comentario y el archivo
// resueltos desde el cliente).
export async function solicitarModificacion(solicitudId: string, comentario: string, formData: FormData): Promise<{ error?: string }> {
  if (!comentario.trim()) return { error: "Escribe un comentario antes de enviar." };
  const { supabase, user, perfil } = await currentUserAndPerfil();
  if (!user) return { error: "Sesión no válida." };

  const file = formData.get("adjunto");
  let adjuntoUrl: string | null = null;
  let adjuntoNombre: string | null = null;
  if (file instanceof File && file.size > 0) {
    const ext = file.name.split(".").pop();
    const path = `modificaciones/${solicitudId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (!upErr) {
      const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      adjuntoUrl = pub.publicUrl;
      adjuntoNombre = file.name;
    }
  }

  const texto = adjuntoUrl ? `${comentario}\n📎 Adjunto: [${adjuntoNombre}](${adjuntoUrl})` : comentario;
  await supabase.from("logs").insert({
    solicitud_id: solicitudId,
    usuario_id: user.id,
    usuario_nombre: perfil?.nombre,
    accion: "comentario",
    detalle: { texto, fecha: new Date().toISOString() },
  });
  if (adjuntoUrl && adjuntoNombre) {
    await supabase.from("adjuntos").insert({
      solicitud_id: solicitudId,
      url: adjuntoUrl,
      nombre: adjuntoNombre,
      tipo: "modificacion",
      subido_por: user.id,
      subido_por_nombre: perfil?.nombre,
    });
  }

  return cambiarEstado(solicitudId, "modificar_diseno");
}

// Réplica de guardarPortadaElegida() (~3413-3419).
export async function guardarPortadaElegida(solicitudId: string, catalogo: string, portadaElegida: string): Promise<{ error?: string }> {
  const { supabase } = await currentUserAndPerfil();
  const { error } = await supabase
    .from("solicitud_catalogos")
    .update({ portada_elegida: portadaElegida })
    .eq("solicitud_id", solicitudId)
    .eq("catalogo", catalogo);
  if (error) return { error: `Error: ${error.message}` };
  return {};
}

// Réplica de addComentario() (~3364-3401), incluida la notificación a los
// mencionados (~3393-3405, COM-07) excluyendo siempre al propio autor.
export async function addComentario(solicitudId: string, texto: string): Promise<{ error?: string; mencionados?: number }> {
  const trimmed = texto.trim();
  if (!trimmed) return { error: "Escribe un comentario." };
  const { supabase, user, perfil } = await currentUserAndPerfil();
  if (!user) return { error: "Sesión no válida." };

  const { data: perfiles } = await supabase.from("perfiles").select("id, nombre, email, notif_preferencia");
  const mencionados = perfilesMencionados(trimmed, perfiles ?? []);

  const { error } = await supabase.from("logs").insert({
    solicitud_id: solicitudId,
    usuario_id: user.id,
    usuario_nombre: perfil?.nombre,
    accion: "comentario",
    detalle: { texto: trimmed, fecha: new Date().toISOString(), menciones: mencionados.map((m) => m.nombre) },
  });
  if (error) return { error: `Error: ${error.message}` };

  const destinatarios = mencionados.filter((m) => m.id !== user.id);
  await enviarNotificacionesMencion(supabase, solicitudId, perfil?.nombre ?? null, trimmed, destinatarios);

  return { mencionados: mencionados.length };
}
