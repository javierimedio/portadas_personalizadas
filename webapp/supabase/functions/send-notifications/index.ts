// Edge Function `send-notifications` — único proceso de envío real de email
// de toda la aplicación (arquitectura Outbox + pg_cron, acordada 2026-08-05).
// Toda la lógica de negocio (qué evento genera qué mensaje, a quién, según
// qué preferencia) vive en Next.js y solo deja filas en `notificaciones`;
// esta función únicamente consume las pendientes (`enviado = false`) y las
// entrega — es la ÚNICA pieza que sabe de SMTP y de la plantilla HTML. Toda
// su configuración (tamaño de lote, reintentos, remitente...) vive en
// `./config.ts`, no como literales sueltos aquí.
//
// Disparador: pg_cron, una vez por minuto, sin ningún otro mecanismo de
// disparo (decisión explícita: un solo camino de envío es más simple, más
// fácil de diagnosticar y evita condiciones de carrera entre disparadores —
// ver conversación de diseño). Programación (ejecutar una sola vez, a mano,
// en el SQL Editor de cada proyecto — SQL limpio en
// docs/10-auditoria-despliegue-manual.md, no aquí porque este archivo es
// TypeScript, no SQL). Requiere las extensiones `pg_cron` y `pg_net`
// habilitadas (Database → Extensions) — no se activan desde una migración,
// es un paso de Dashboard.
//
// Semántica de entrega — "al menos una vez", no "exactamente una vez"
// (revisión 2026-08-05): si el envío SMTP tiene éxito pero el proceso muere
// antes de completar el `UPDATE enviado=true` posterior, la fila sigue
// `enviado=false` y se reintenta más adelante — puede producir, en ese caso
// límite concreto, un email duplicado. Es una decisión consciente: evitarlo
// del todo exigiría un protocolo de dos fases (marcar antes de enviar,
// deshacer si falla) que no se justifica para notificaciones informativas
// como estas. Si en el futuro se envían notificaciones donde un duplicado
// sea inaceptable, revisar esto explícitamente antes de reutilizar el mismo
// mecanismo.
//
// ⚠️ Igual que `create-user`: este archivo (y `config.ts`, en el mismo
// directorio) viven en el repositorio, pero la función real que se ejecuta
// en cada proyecto Supabase es la copia pegada a mano en el Dashboard (Edge
// Functions → send-notifications → editor → Deploy) — hace falta copiar
// AMBOS archivos, `index.ts` importa `./config.ts`. Un cambio aquí no tiene
// ningún efecto hasta hacer ese paso.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";
import { CONFIG } from "./config.ts";

function renderPlantilla(asunto: string, cuerpo: string): string {
  // Plantilla corporativa ÚNICA de todos los emails de la aplicación —
  // cualquier cambio visual futuro se hace aquí, nunca en Next.js. Diseño
  // provisional a definir con el propietario del proyecto (2026-08-05: no
  // replica ninguna plantilla anterior, no existía ninguna recuperable).
  // Solo se escapa texto que va como contenido (nunca como atributo HTML),
  // así que basta con &/</> — asunto/cuerpo pueden venir de texto libre de
  // usuario (p. ej. un comentario con mención), de ahí que este escapado no
  // sea opcional.
  const escapar = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html>
<html>
  <body style="font-family: Arial, Helvetica, sans-serif; background:#f4f4f5; padding:24px; margin:0;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;">
      <div style="font-weight:700;font-size:16px;color:#1a1a1a;margin-bottom:16px;">${escapar(asunto)}</div>
      <div style="font-size:14px;line-height:1.6;color:#333333;white-space:pre-line;">${escapar(cuerpo)}</div>
      <hr style="margin:28px 0;border:none;border-top:1px solid #e5e5e5;" />
      <div style="font-size:11px;color:#999999;">${escapar(CONFIG.REMITENTE_NOMBRE)} — notificación automática, no respondas a este correo.</div>
    </div>
  </body>
</html>`;
}

// Único punto de escritura del resultado de procesar una fila — centraliza
// el `bloqueado_hasta: null` (liberar el reclamo) para que ningún camino
// nuevo que se añada en el futuro pueda olvidarlo por descuido.
async function marcarResultado(supabaseAdmin: SupabaseClient, id: string, patch: Record<string, unknown>): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("notificaciones")
    .update({ bloqueado_hasta: null, ...patch })
    .eq("id", id);
  if (error) console.error("[send-notifications] fallo al actualizar la notificación tras procesarla", { id, patch, error });
  return !error;
}

Deno.serve(async (req: Request) => {
  // Solo pg_cron debe poder invocar esta función. La autenticación usa un
  // secreto propio (CONFIG.CRON_SECRET_ENV) en vez de depender de cómo
  // Supabase inyecta sus propias claves internas (SUPABASE_SERVICE_ROLE_KEY,
  // SUPABASE_JWT_SECRET) en tiempo de ejecución, cuyo formato varía entre
  // versiones de la plataforma y no es controlable desde el código.
  // El nombre del secret vive en config.ts (CONFIG.CRON_SECRET_ENV); su
  // valor es un string aleatorio que el propietario del proyecto genera,
  // almacena en Edge Functions → Secrets y pone también en la cabecera
  // Authorization del cron.schedule() — ver docs/10.
  const cronSecret = (Deno.env.get(CONFIG.CRON_SECRET_ENV) ?? "").trim();
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = (authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : authHeader).trim();

  // ⚠️ DIAGNÓSTICO TEMPORAL — eliminar una vez resuelto el 401 de producción.
  // No registra nunca el secreto completo ni el token completo.
  // Usa console.error (no console.log) porque Supabase filtra los niveles
  // info/log en el visor del Dashboard por defecto.
  console.error("[send-notifications][diag]", {
    secreto_configurado: !!cronSecret,
    longitud_secreto: cronSecret.length,
    longitud_token_recibido: token.length,
    longitud_auth_header_raw: authHeader.length,
    primeros8_esperado: cronSecret.length >= 8 ? cronSecret.slice(0, 8) : `(longitud ${cronSecret.length})`,
    primeros8_recibido: token.length >= 8 ? token.slice(0, 8) : `(longitud ${token.length})`,
  });

  if (!cronSecret) {
    console.error(`[send-notifications] invocación rechazada: ${CONFIG.CRON_SECRET_ENV} no configurado en Edge Functions → Secrets`);
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!token || token !== cronSecret) {
    console.error(`[send-notifications] invocación rechazada: Authorization no coincide con ${CONFIG.CRON_SECRET_ENV}`);
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

  const { data: pendientes, error: claimError } = await supabaseAdmin.rpc("reclamar_notificaciones_pendientes", {
    p_lote: CONFIG.LOTE,
    p_max_intentos: CONFIG.MAX_INTENTOS,
    p_lease_minutos: CONFIG.LEASE_MINUTOS,
  });
  if (claimError) {
    console.error("[send-notifications] fallo al reclamar el lote", claimError);
    return Response.json({ error: claimError.message }, { status: 500 });
  }
  if (!pendientes?.length) {
    return Response.json({ procesadas: 0, enviadas: 0, fallidas: 0 });
  }
  console.log("[send-notifications] lote reclamado", { procesadas: pendientes.length });

  let enviadas = 0;
  let fallidas = 0;

  try {
    const smtpUser = Deno.env.get("SMTP_USER");
    const transporter = nodemailer.createTransport({
      host: Deno.env.get("SMTP_HOST"),
      port: Number(Deno.env.get("SMTP_PORT") ?? 587),
      secure: Number(Deno.env.get("SMTP_PORT") ?? 587) === 465,
      auth: { user: smtpUser, pass: Deno.env.get("SMTP_PASS") },
    });

    for (const n of pendientes) {
      try {
        await transporter.sendMail({
          from: `"${CONFIG.REMITENTE_NOMBRE}" <${smtpUser}>`,
          to: n.destinatario,
          subject: n.asunto,
          html: renderPlantilla(n.asunto, n.cuerpo),
        });
        const ok = await marcarResultado(supabaseAdmin, n.id, { enviado: true, enviado_at: new Date().toISOString() });
        if (ok) enviadas++;
      } catch (err) {
        fallidas++;
        const mensaje = err instanceof Error ? err.message : String(err);
        console.error("[send-notifications] fallo al enviar", { id: n.id, destinatario: n.destinatario, error: mensaje });
        await marcarResultado(supabaseAdmin, n.id, { ultimo_error: mensaje });
      }
    }
  } catch (err) {
    // Fallo fuera del try/catch por fila (p. ej. al construir el
    // transporter) — sin esto, las filas ya reclamadas se quedarían
    // "bloqueadas" hasta que expire el lease, sin ningún rastro de qué
    // pasó. Se liberan todas explícitamente y se deja constancia del motivo.
    const mensaje = err instanceof Error ? err.message : String(err);
    console.error("[send-notifications] fallo inesperado procesando el lote — liberando filas reclamadas", { error: mensaje });
    await Promise.all(pendientes.map((n) => marcarResultado(supabaseAdmin, n.id, { ultimo_error: mensaje })));
    return Response.json({ error: mensaje, procesadas: pendientes.length }, { status: 500 });
  }

  console.log("[send-notifications] lote procesado", { procesadas: pendientes.length, enviadas, fallidas });
  return Response.json({ procesadas: pendientes.length, enviadas, fallidas });
});
