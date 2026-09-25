"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/shared/infrastructure/supabase/server-client";
import { perfilesMencionados } from "../domain/comentarios";
import { buildLogsDevolucionComercial } from "../domain/devolucion";
import {
  enviarNotificacion,
  enviarNotificacionAsignacion,
  enviarNotificacionesMencion,
} from "@/features/notificaciones/application/enviar-notificacion";
import { borrarArchivosStorage } from "@/shared/storage/server";
import { STORAGE_BUCKET } from "@/shared/storage/constants";
import { ELIMINAR_ADJUNTO_ROLES } from "../domain/estado-flujo";
import { validarEnlace, puedeAgregarEnlace, puedeEliminarEnlace, esEnlaceExterno } from "../domain/enlace-externo";
import { portadasObligatoriasPendientes, mensajePortadasPendientes } from "../domain/portadas-validation";
import type { UploadedFile } from "@/shared/storage/types";

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

// Variante de cambiarEstado() para "Devolver al comercial": acepta un motivo
// opcional que se incluye en la notificación de vuelta a borrador.
export async function devolverAlComercial(solicitudId: string, motivo: string): Promise<{ error?: string }> {
  const { supabase, user, perfil } = await currentUserAndPerfil();
  if (!user) return { error: "Sesión no válida." };

  const { data: sol } = await supabase.from("solicitudes").select("estado").eq("id", solicitudId).maybeSingle();
  if (!sol) return { error: "Solicitud no encontrada." };
  if (sol.estado === "borrador") return {};

  const { error } = await supabase.from("solicitudes").update({ estado: "borrador" }).eq("id", solicitudId);
  if (error) return { error: `Error: ${error.message}` };

  const logsAInsertar = buildLogsDevolucionComercial(sol.estado, motivo, new Date().toISOString());
  for (const log of logsAInsertar) {
    await supabase.from("logs").insert({
      solicitud_id: solicitudId,
      usuario_id: user.id,
      usuario_nombre: perfil?.nombre,
      accion: log.accion,
      detalle: log.detalle,
    });
  }
  await enviarNotificacion(supabase, solicitudId, "borrador", motivo.trim() || null);
  return {};
}

// Devuelve la solicitud desde diseño al comercial (en_diseno → pendiente_comercial).
// La explicación es obligatoria. Usa RPC en lugar de REST directo para evitar
// el bug de caché de PostgREST con valores de enum añadidos via ADD VALUE:
// dentro de la función PL/pgSQL el UPDATE resuelve el enum contra el catálogo
// vivo de Postgres, sin pasar por el cache de PostgREST. El RPC también
// garantiza atomicidad: estado + comentario + historial en una sola transacción.
// La notificación se envía fuera (no se puede hacer desde dentro de la función BD).
export async function devolverDesdeDisenador(solicitudId: string, explicacion: string): Promise<{ error?: string }> {
  if (!explicacion.trim()) return { error: "La explicación es obligatoria." };
  const { supabase, user } = await currentUserAndPerfil();
  if (!user) return { error: "Sesión no válida." };

  const { data, error } = await supabase.rpc("devolver_desde_disenador", {
    p_solicitud_id: solicitudId,
    p_explicacion: explicacion.trim(),
  });

  if (error) {
    console.error("[devolverDesdeDisenador] RPC error", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { error: `Error: ${error.message}` };
  }

  const result = data as { ok?: boolean; error?: string } | null;
  if (result?.error) return { error: result.error };

  await enviarNotificacion(supabase, solicitudId, "pendiente_comercial", explicacion.trim());
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
  revalidatePath("/diseno");
  return {};
}

// Auto-asignación desde la tabla de Diseño: solo actualiza `asignado_id`
// sin tocar el estado (a diferencia de `asignarDisenadorYEnviar`, que
// siempre fuerza `en_diseno`). Pensada para que un diseñador pueda
// reclamar una tarea directamente desde la fila de la tabla.
export async function reasignarDisenador(solicitudId: string, disenadorId: string): Promise<{ error?: string }> {
  if (!disenadorId) return { error: "Selecciona un diseñador." };
  const { supabase, user, perfil } = await currentUserAndPerfil();
  if (!user) return { error: "Sesión no válida." };

  const { error } = await supabase.from("solicitudes").update({ asignado_id: disenadorId }).eq("id", solicitudId);
  if (error) return { error: `Error: ${error.message}` };

  const { data: disenador } = await supabase.from("perfiles").select("nombre, email").eq("id", disenadorId).maybeSingle();
  await supabase.from("logs").insert({
    solicitud_id: solicitudId,
    usuario_id: user.id,
    usuario_nombre: perfil?.nombre,
    accion: "asignacion",
    detalle: { disenador: disenador?.nombre },
  });
  // No notificar al diseñador cuando se asigna a sí mismo
  if (disenador?.email && user.id !== disenadorId) await enviarNotificacionAsignacion(supabase, solicitudId, disenador.email);
  revalidatePath("/diseno");
  return {};
}

// Réplica de marcarDisenoListo() (~5532-5556): registra los diseños ya
// subidos y avanza a "Revisión cliente". Arquitectura de subida
// (docs/09-matriz-paridad-funcional.md § "Arquitectura de subida de
// archivos", 2026-08-04): los archivos ya están en Storage — subidos desde
// el navegador por `SolicitudDetalleModal` antes de llamar aquí — así que
// esta acción solo recibe su metadata, nunca un `File`.
export async function marcarDisenoListo(
  solicitudId: string,
  archivos: { archivo: UploadedFile; catalogo: string }[]
): Promise<{ error?: string }> {
  const { supabase, user, perfil } = await currentUserAndPerfil();
  if (!user) return { error: "Sesión no válida." };

  for (const { archivo, catalogo } of archivos) {
    await supabase.from("adjuntos").insert({
      solicitud_id: solicitudId,
      nombre: archivo.nombre,
      tipo: "diseno_portada",
      url: archivo.url,
      storage_path: archivo.path,
      catalogo,
      subido_por: user.id,
      subido_por_nombre: perfil?.nombre,
    });
  }

  const { data: cats } = await supabase
    .from("solicitud_catalogos")
    .select("catalogo, portada_personalizada, portada_diseno_propio")
    .eq("solicitud_id", solicitudId);

  const { data: adjs } = await supabase
    .from("adjuntos")
    .select("tipo, catalogo")
    .eq("solicitud_id", solicitudId)
    .eq("tipo", "diseno_portada");

  const faltantes = portadasObligatoriasPendientes(cats ?? [], adjs ?? []);
  if (faltantes.length > 0) return { error: mensajePortadasPendientes(faltantes) };

  return cambiarEstado(solicitudId, "diseno_en_revision_comercial");
}

// Réplica de enviarModificacion() (~3462-3520), sin el resto de lógica de
// modales del original (aquí ya viene con el comentario y los archivos
// resueltos desde el cliente). Los adjuntos, si los hay, ya están subidos a
// Storage — se recibe su metadata, no un `File`.
export async function solicitarModificacion(
  solicitudId: string,
  comentario: string,
  adjuntos: UploadedFile[]
): Promise<{ error?: string }> {
  if (!comentario.trim()) return { error: "Escribe un comentario antes de enviar." };
  const { supabase, user, perfil } = await currentUserAndPerfil();
  if (!user) return { error: "Sesión no válida." };

  const adjuntosTexto =
    adjuntos.length > 0
      ? "\n" + adjuntos.map((a) => `📎 Adjunto: [${a.nombre}](${a.url})`).join("\n")
      : "";
  await supabase.from("logs").insert({
    solicitud_id: solicitudId,
    usuario_id: user.id,
    usuario_nombre: perfil?.nombre,
    accion: "comentario",
    detalle: { texto: comentario + adjuntosTexto, fecha: new Date().toISOString() },
  });
  for (const adjunto of adjuntos) {
    await supabase.from("adjuntos").insert({
      solicitud_id: solicitudId,
      url: adjunto.url,
      nombre: adjunto.nombre,
      tipo: "modificacion",
      storage_path: adjunto.path,
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

// Deriva el path de Storage a partir de la URL pública cuando `storage_path`
// no está disponible en la BD (adjuntos creados antes de la migración
// 20260918000100_eliminar_adjuntos.sql). Formato conocido:
// https://<host>/storage/v1/object/public/<bucket>/<path>
function storagePathDesdeUrl(url: string): string | null {
  const marker = `/${STORAGE_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx < 0) return null;
  try {
    return decodeURIComponent(url.slice(idx + marker.length));
  } catch {
    return url.slice(idx + marker.length);
  }
}

// Borra un adjunto de tipo "diseno_portada": elimina la fila en BD y el
// objeto en Storage. Solo lo pueden ejecutar los roles en ELIMINAR_ADJUNTO_ROLES;
// la RLS de BD (adjuntos_delete) y la policy de Storage (portadas_adjuntos_delete)
// replican el mismo guard a nivel de base de datos para que la comprobación
// aquí no sea el único freno.
export async function eliminarAdjunto(adjuntoId: string): Promise<{ error?: string }> {
  const { supabase, user, perfil } = await currentUserAndPerfil();
  if (!user) return { error: "Sesión no válida." };
  if (!(ELIMINAR_ADJUNTO_ROLES as readonly string[]).includes(perfil?.rol ?? "")) {
    return { error: "No tienes permiso para eliminar portadas." };
  }

  const { data: adjunto } = await supabase.from("adjuntos").select("tipo, url, storage_path, solicitud_id").eq("id", adjuntoId).maybeSingle();
  if (!adjunto) return { error: "Adjunto no encontrado." };
  if (adjunto.tipo !== "diseno_portada") return { error: "Solo se pueden eliminar diseños de portada." };

  const { error } = await supabase.from("adjuntos").delete().eq("id", adjuntoId);
  if (error) return { error: `Error: ${error.message}` };

  await supabase.from("logs").insert({
    solicitud_id: adjunto.solicitud_id,
    usuario_id: user.id,
    usuario_nombre: perfil?.nombre,
    accion: "eliminar_adjunto",
    detalle: { adjunto_id: adjuntoId },
  });

  const path = adjunto.storage_path ?? storagePathDesdeUrl(adjunto.url);
  if (path) await borrarArchivosStorage(supabase, [path]);

  revalidatePath("/diseno");
  return {};
}

// Adjunta un documento desde el comercial mientras la solicitud está en
// pendiente_comercial, para que el diseñador lo pueda consultar cuando
// retome el trabajo. El archivo ya está en Storage — se recibe solo su
// metadata. Registra la subida en logs (accion "subida_documento") para
// que aparezca en el historial sin filtrarse como comentario.
export async function subirDocumentoAdjunto(solicitudId: string, adjunto: UploadedFile): Promise<{ error?: string }> {
  const { supabase, user, perfil } = await currentUserAndPerfil();
  if (!user) return { error: "Sesión no válida." };

  const { error: insertError } = await supabase.from("adjuntos").insert({
    solicitud_id: solicitudId,
    nombre: adjunto.nombre,
    tipo: "adjunto_comercial",
    url: adjunto.url,
    storage_path: adjunto.path,
    subido_por: user.id,
    subido_por_nombre: perfil?.nombre,
  });
  if (insertError) return { error: `Error al guardar el adjunto: ${insertError.message}` };

  await supabase.from("logs").insert({
    solicitud_id: solicitudId,
    usuario_id: user.id,
    usuario_nombre: perfil?.nombre,
    accion: "subida_documento",
    detalle: { nombre: adjunto.nombre, url: adjunto.url },
  });

  return {};
}

// Añade un enlace externo a los adjuntos de una solicitud.
export async function agregarEnlace(solicitudId: string, nombre: string, url: string): Promise<{ error?: string }> {
  const validationError = validarEnlace(nombre, url);
  if (validationError) return { error: validationError };

  const { supabase, user, perfil } = await currentUserAndPerfil();
  if (!user) return { error: "Sesión no válida." };
  if (!puedeAgregarEnlace(perfil?.rol)) return { error: "No tienes permiso para añadir enlaces." };

  const { error: insertError } = await supabase.from("adjuntos").insert({
    solicitud_id: solicitudId,
    nombre: nombre.trim(),
    tipo: "enlace_externo",
    url: url.trim(),
    storage_path: null,
    subido_por: user.id,
    subido_por_nombre: perfil?.nombre,
  });
  if (insertError) return { error: `Error al guardar el enlace: ${insertError.message}` };

  await supabase.from("logs").insert({
    solicitud_id: solicitudId,
    usuario_id: user.id,
    usuario_nombre: perfil?.nombre,
    accion: "agregar_enlace",
    detalle: { nombre: nombre.trim(), url: url.trim() },
  });

  return {};
}

// Elimina un enlace externo de los adjuntos de una solicitud.
export async function eliminarEnlace(adjuntoId: string): Promise<{ error?: string }> {
  const { supabase, user, perfil } = await currentUserAndPerfil();
  if (!user) return { error: "Sesión no válida." };

  const { data: adjunto } = await supabase.from("adjuntos").select("tipo, nombre, subido_por, solicitud_id").eq("id", adjuntoId).maybeSingle();
  if (!adjunto) return { error: "Enlace no encontrado." };
  if (!esEnlaceExterno(adjunto.tipo)) return { error: "Este adjunto no es un enlace externo." };
  if (!puedeEliminarEnlace(perfil?.rol, adjunto.subido_por, user.id)) return { error: "No tienes permiso para eliminar este enlace." };

  const { error } = await supabase.from("adjuntos").delete().eq("id", adjuntoId);
  if (error) return { error: `Error al eliminar el enlace: ${error.message}` };

  await supabase.from("logs").insert({
    solicitud_id: adjunto.solicitud_id,
    usuario_id: user.id,
    usuario_nombre: perfil?.nombre,
    accion: "eliminar_enlace",
    detalle: { nombre: adjunto.nombre },
  });

  return {};
}

// Réplica de addComentario() (~3364-3401), incluida la notificación a los
// mencionados (~3393-3405, COM-07) excluyendo siempre al propio autor.
export async function addComentario(solicitudId: string, texto: string): Promise<{ error?: string; mencionados?: number }> {
  const trimmed = texto.trim();
  if (!trimmed) return { error: "Escribe un comentario." };
  const { supabase, user, perfil } = await currentUserAndPerfil();
  if (!user) return { error: "Sesión no válida." };

  const { data: perfiles } = await supabase.from("perfiles").select("id, nombre, email, notif_preferencia").eq("activo", true);
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
