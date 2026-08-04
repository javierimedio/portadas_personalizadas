import type { createClient } from "@/shared/infrastructure/supabase/server-client";
import { buildAsignacionNotificacion, buildMencionNotificacion, buildNotificaciones } from "../domain/enviar-notificacion";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Réplica de enviarNotificacion() (index.html ~5561-5649), resuelta contra la
// BD en vez de contra el caché en memoria del cliente: como esto corre en un
// Server Action, la solicitud y los perfiles siempre están frescos, así que
// no hace falta el parámetro de fallback que el original necesitaba para el
// caso "la solicitud recién creada aún no está en `allSolicitudes`" (NOT-09)
// — ese problema es propio de un SPA con caché de cliente y no existe aquí.
// No es una llamada "use server" independiente: solo se invoca desde dentro
// de otros Server Actions que ya tienen su propio cliente de Supabase.
export async function enviarNotificacion(supabase: Supabase, solicitudId: string, estado: string): Promise<void> {
  const { data: sol } = await supabase
    .from("solicitudes")
    .select("cod_sap, nombre_empresa, comercial_id")
    .eq("id", solicitudId)
    .maybeSingle();
  if (!sol) return;

  const { data: perfilesRaw } = await supabase.from("perfiles").select("id, email, nombre, rol").eq("activo", true);
  const perfiles = perfilesRaw ?? [];

  const comercial = perfiles.find((p) => p.id === sol.comercial_id);
  const mktAdminEmails = perfiles.filter((p) => ["marketing", "admin"].includes(p.rol ?? "")).map((p) => p.email);
  const disenadorEmails = perfiles.filter((p) => ["disenador", "responsable_diseno"].includes(p.rol ?? "")).map((p) => p.email);

  const mensajes = buildNotificaciones(estado, {
    codSap: sol.cod_sap,
    nombreEmpresa: sol.nombre_empresa,
    comercialNombre: comercial?.nombre ?? null,
    comercialEmail: comercial?.email ?? null,
    mktAdminEmails,
    disenadorEmails,
  });
  if (!mensajes.length) return;

  await supabase.from("notificaciones").insert(
    mensajes.map((m) => ({ solicitud_id: solicitudId, destinatario: m.destinatario, asunto: m.asunto, cuerpo: m.cuerpo, enviado: false, enviado_at: null }))
  );
}

// Réplica del aviso directo de confirmAsignar() (~3690-3695) — un único
// destinatario, fuera del switch/case de enviarNotificacion().
export async function enviarNotificacionAsignacion(supabase: Supabase, solicitudId: string, disenadorEmail: string): Promise<void> {
  const { data: sol } = await supabase.from("solicitudes").select("cod_sap, nombre_empresa").eq("id", solicitudId).maybeSingle();
  if (!sol) return;

  const mensaje = buildAsignacionNotificacion({ codSap: sol.cod_sap, nombreEmpresa: sol.nombre_empresa, disenadorEmail });
  await supabase.from("notificaciones").insert({
    solicitud_id: solicitudId,
    destinatario: mensaje.destinatario,
    asunto: mensaje.asunto,
    cuerpo: mensaje.cuerpo,
    enviado: false,
    enviado_at: null,
  });
}

// Réplica del aviso a mencionados de addComentario() (~3393-3405, COM-07) —
// el llamador ya excluyó al propio autor del comentario de `destinatarios`.
export async function enviarNotificacionesMencion(
  supabase: Supabase,
  solicitudId: string,
  autorNombre: string | null,
  texto: string,
  destinatarios: { email: string }[]
): Promise<void> {
  if (!destinatarios.length) return;
  const { data: sol } = await supabase.from("solicitudes").select("cod_sap").eq("id", solicitudId).maybeSingle();
  if (!sol) return;

  const mensajes = destinatarios.map((d) => buildMencionNotificacion({ autorNombre, codSap: sol.cod_sap, texto, destinatarioEmail: d.email }));
  await supabase.from("notificaciones").insert(
    mensajes.map((m) => ({ solicitud_id: solicitudId, destinatario: m.destinatario, asunto: m.asunto, cuerpo: m.cuerpo, enviado: false, enviado_at: null }))
  );
}
