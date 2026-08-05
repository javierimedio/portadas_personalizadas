import type { createClient } from "@/shared/infrastructure/supabase/server-client";
import { buildAsignacionNotificacion, buildMencionNotificacion, buildNotificaciones, resolverEntrega, type NotifMensaje } from "../domain/enviar-notificacion";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Único punto de inserción en `notificaciones` de toda la aplicación
// (arquitectura de notificaciones por email, 2026-08-05): decide, por cada
// mensaje, si se crea la fila y si cuenta como ya entregada (resolverEntrega,
// según `notif_preferencia` del destinatario) y la inserta. Los tres
// generadores de eventos de abajo son deliberadamente delgados — solo
// resuelven "qué mensaje(s) produce este evento y con qué preferencia por
// destinatario"; cualquier evento nuevo (reasignación, archivado, lo que
// venga) se añade como un generador más que llama a esto, sin duplicar la
// lógica de inserción. El envío real por email lo hace un proceso
// completamente aparte (Edge Function `send-notifications` vía pg_cron) que
// consume las filas con `enviado = false` — este módulo nunca envía nada,
// solo deja la fila lista en la cola.
async function insertarNotificaciones(
  supabase: Supabase,
  solicitudId: string,
  mensajes: NotifMensaje[],
  preferenciaPorEmail: Map<string, string | null | undefined>,
  logTag: string
): Promise<void> {
  const filas = mensajes.flatMap((m) => {
    const { crear, entregada } = resolverEntrega(preferenciaPorEmail.get(m.destinatario));
    if (!crear) return [];
    return [{ solicitud_id: solicitudId, destinatario: m.destinatario, asunto: m.asunto, cuerpo: m.cuerpo, enviado: entregada, enviado_at: entregada ? new Date().toISOString() : null }];
  });
  if (!filas.length) return;

  const { error } = await supabase.from("notificaciones").insert(filas);
  if (error) console.error(`[${logTag}] fallo al insertar en notificaciones`, { solicitudId, error });
}

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

  const { data: perfilesRaw } = await supabase.from("perfiles").select("id, email, nombre, rol, notif_preferencia").eq("activo", true);
  const perfiles = perfilesRaw ?? [];
  const preferenciaPorEmail = new Map(perfiles.map((p) => [p.email, p.notif_preferencia]));

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
  await insertarNotificaciones(supabase, solicitudId, mensajes, preferenciaPorEmail, "enviarNotificacion");
}

// Réplica del aviso directo de confirmAsignar() (~3690-3695) — un único
// destinatario, fuera del switch/case de enviarNotificacion().
export async function enviarNotificacionAsignacion(supabase: Supabase, solicitudId: string, disenadorEmail: string): Promise<void> {
  const { data: sol } = await supabase.from("solicitudes").select("cod_sap, nombre_empresa").eq("id", solicitudId).maybeSingle();
  if (!sol) return;

  const { data: disenadorPerfil } = await supabase.from("perfiles").select("notif_preferencia").eq("email", disenadorEmail).maybeSingle();
  const mensaje = buildAsignacionNotificacion({ codSap: sol.cod_sap, nombreEmpresa: sol.nombre_empresa, disenadorEmail });
  await insertarNotificaciones(
    supabase,
    solicitudId,
    [mensaje],
    new Map([[disenadorEmail, disenadorPerfil?.notif_preferencia]]),
    "enviarNotificacionAsignacion"
  );
}

// Réplica del aviso a mencionados de addComentario() (~3393-3405, COM-07) —
// el llamador ya excluyó al propio autor del comentario de `destinatarios`.
export async function enviarNotificacionesMencion(
  supabase: Supabase,
  solicitudId: string,
  autorNombre: string | null,
  texto: string,
  destinatarios: { email: string; notif_preferencia?: string | null }[]
): Promise<void> {
  if (!destinatarios.length) return;
  const { data: sol } = await supabase.from("solicitudes").select("cod_sap").eq("id", solicitudId).maybeSingle();
  if (!sol) return;

  const mensajes = destinatarios.map((d) => buildMencionNotificacion({ autorNombre, codSap: sol.cod_sap, texto, destinatarioEmail: d.email }));
  const preferenciaPorEmail = new Map(destinatarios.map((d) => [d.email, d.notif_preferencia]));
  await insertarNotificaciones(supabase, solicitudId, mensajes, preferenciaPorEmail, "enviarNotificacionesMencion");
}
