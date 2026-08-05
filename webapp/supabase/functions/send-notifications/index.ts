// Edge Function `send-notifications` — único proceso de envío real de email
// de toda la aplicación (arquitectura Outbox + pg_cron, acordada 2026-08-05).
// Toda la lógica de negocio (qué evento genera qué mensaje, a quién, según
// qué preferencia) vive en Next.js y solo deja filas en `notificaciones`;
// esta función únicamente consume las pendientes (`enviado = false`) y las
// entrega — es la ÚNICA pieza que sabe de SMTP y de la plantilla HTML.
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
// ⚠️ Igual que `create-user`: este archivo vive en el repositorio, pero la
// función real que se ejecuta en cada proyecto Supabase es la copia pegada a
// mano en el Dashboard (Edge Functions → send-notifications → editor →
// Deploy). Un cambio aquí no tiene ningún efecto hasta hacer ese paso.
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

const LOTE = 50;
const MAX_INTENTOS = 5;
const LEASE_MINUTOS = 2;

function renderPlantilla(asunto: string, cuerpo: string): string {
  // Plantilla corporativa ÚNICA de todos los emails de la aplicación —
  // cualquier cambio visual futuro se hace aquí, nunca en Next.js.
  const escapar = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html>
<html>
  <body style="font-family: Arial, Helvetica, sans-serif; background:#f4f4f5; padding:24px; margin:0;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;">
      <div style="font-weight:700;font-size:16px;color:#1a1a1a;margin-bottom:16px;">${escapar(asunto)}</div>
      <div style="font-size:14px;line-height:1.6;color:#333333;white-space:pre-line;">${escapar(cuerpo)}</div>
      <hr style="margin:28px 0;border:none;border-top:1px solid #e5e5e5;" />
      <div style="font-size:11px;color:#999999;">Portadas GOR — notificación automática, no respondas a este correo.</div>
    </div>
  </body>
</html>`;
}

Deno.serve(async () => {
  const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: pendientes, error: claimError } = await supabaseAdmin.rpc("reclamar_notificaciones_pendientes", {
    p_lote: LOTE,
    p_max_intentos: MAX_INTENTOS,
    p_lease_minutos: LEASE_MINUTOS,
  });
  if (claimError) {
    console.error("[send-notifications] fallo al reclamar el lote", claimError);
    return Response.json({ error: claimError.message }, { status: 500 });
  }
  if (!pendientes?.length) {
    return Response.json({ procesadas: 0, enviadas: 0, fallidas: 0 });
  }
  console.log("[send-notifications] lote reclamado", { procesadas: pendientes.length });

  const transporter = nodemailer.createTransport({
    host: Deno.env.get("SMTP_HOST"),
    port: Number(Deno.env.get("SMTP_PORT") ?? 587),
    secure: Number(Deno.env.get("SMTP_PORT") ?? 587) === 465,
    auth: { user: Deno.env.get("SMTP_USER"), pass: Deno.env.get("SMTP_PASS") },
  });

  let enviadas = 0;
  let fallidas = 0;

  for (const n of pendientes) {
    try {
      await transporter.sendMail({
        from: Deno.env.get("SMTP_USER"),
        to: n.destinatario,
        subject: n.asunto,
        html: renderPlantilla(n.asunto, n.cuerpo),
      });
      const { error } = await supabaseAdmin
        .from("notificaciones")
        .update({ enviado: true, enviado_at: new Date().toISOString(), bloqueado_hasta: null })
        .eq("id", n.id);
      if (error) {
        console.error("[send-notifications] enviado pero fallo al marcar enviado=true", { id: n.id, error });
      } else {
        enviadas++;
      }
    } catch (err) {
      fallidas++;
      const mensaje = err instanceof Error ? err.message : String(err);
      console.error("[send-notifications] fallo al enviar", { id: n.id, destinatario: n.destinatario, error: mensaje });
      const { error } = await supabaseAdmin.from("notificaciones").update({ ultimo_error: mensaje, bloqueado_hasta: null }).eq("id", n.id);
      if (error) console.error("[send-notifications] fallo también al registrar ultimo_error", { id: n.id, error });
    }
  }

  console.log("[send-notifications] lote procesado", { procesadas: pendientes.length, enviadas, fallidas });
  return Response.json({ procesadas: pendientes.length, enviadas, fallidas });
});
