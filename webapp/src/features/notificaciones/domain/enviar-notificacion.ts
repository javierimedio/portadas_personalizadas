import { ASUNTO_BASE } from "./config";

// Réplica de enviarNotificacion() (index.html ~5561-5649): el switch/case
// que decide destinatarios y textos por transición de estado (NOT-02 a
// NOT-08). Aquí es una función pura — la resolución de emails reales
// (perfiles, comercial, diseñadores) vive en la capa de aplicación, que ya
// tiene acceso a Supabase.
//
// H-03/NOT-12 (corregido 2026-08-04, a petición explícita del propietario
// del proyecto — "implementa completamente las preferencias de
// notificación... a partir de ahora esa preferencia debe gobernar todo el
// sistema"): `enviado`/`enviado_at` ya no se fijan siempre a `false`/`null`.
// `resolverEntrega()` decide, según la preferencia del destinatario, si el
// registro se crea y si cuenta como ya entregado.
export type NotifRecipients = {
  codSap: string;
  nombreEmpresa: string | null;
  comercialNombre: string | null;
  comercialEmail: string | null;
  mktAdminEmails: (string | null | undefined)[];
  disenadorEmails: (string | null | undefined)[];
};

export type NotifMensaje = { destinatario: string; asunto: string; cuerpo: string };

function dedupeEmails(emails: (string | null | undefined)[]): string[] {
  return [...new Set(emails.filter((e): e is string => Boolean(e)))];
}

// Réplica de buildNotificaciones()/push() (~5581-5638): un mismo mensaje se
// expande a un destinatario por email único (NOT-08).
export function buildNotificaciones(estado: string, ctx: NotifRecipients): NotifMensaje[] {
  const notifs: NotifMensaje[] = [];
  const base = `${ASUNTO_BASE} ${ctx.codSap}`;
  const nombre = ctx.nombreEmpresa || "";

  function push(emails: (string | null | undefined)[], asunto: string, cuerpo: string) {
    dedupeEmails(emails).forEach((destinatario) => notifs.push({ destinatario, asunto, cuerpo }));
  }

  switch (estado) {
    case "enviada":
    case "en_revision_marketing":
      push(
        ctx.mktAdminEmails,
        `${base} — Nueva solicitud de ${ctx.comercialNombre ?? ""}`,
        `Nueva solicitud de portada para el cliente ${ctx.codSap} (${nombre}) creada por ${ctx.comercialNombre ?? ""}. Accede al panel para revisarla.`
      );
      push(
        [ctx.comercialEmail],
        `${base} — Solicitud enviada correctamente`,
        `Tu solicitud de portada para el cliente ${ctx.codSap} (${nombre}) ha sido enviada correctamente y está pendiente de revisión.`
      );
      break;

    case "en_diseno":
      push([ctx.comercialEmail, ...ctx.mktAdminEmails], `${base} — En diseño`, `La solicitud para ${ctx.codSap} (${nombre}) ha pasado a diseño.`);
      push(
        ctx.disenadorEmails,
        `${base} — Nueva tarea de diseño`,
        `Hay una nueva solicitud de portada para el cliente ${ctx.codSap} (${nombre}) esperando ser asignada.`
      );
      break;

    case "diseno_en_revision_comercial":
      push(
        [ctx.comercialEmail, ...ctx.mktAdminEmails],
        `${base} — Diseño listo para revisión`,
        `El diseño de portada para el cliente ${ctx.codSap} (${nombre}) está listo para revisión. Accede a la herramienta para aprobarlo o solicitar cambios.`
      );
      break;

    case "modificar_diseno":
      push(
        ctx.disenadorEmails,
        `${base} — Modificaciones solicitadas`,
        `Se han solicitado modificaciones en el diseño de portada para el cliente ${ctx.codSap} (${nombre}). Accede a la herramienta para ver los comentarios.`
      );
      break;

    case "confirmada":
      push([ctx.comercialEmail, ...ctx.mktAdminEmails], `${base} — ✓ Confirmada`, `La solicitud de portada para el cliente ${ctx.codSap} (${nombre}) ha sido confirmada.`);
      break;

    case "borrador":
      push(
        [ctx.comercialEmail],
        `${base} — Devuelta para completar`,
        `Tu solicitud de portada para el cliente ${ctx.codSap} (${nombre}) ha sido devuelta. Accede a la herramienta para editarla y reenviarla.`
      );
      break;
  }

  return notifs;
}

// Réplica del aviso de asignación directa de confirmAsignar() (~3690-3695):
// un mensaje único al diseñador asignado, fuera del switch/case anterior —
// "Asignar y enviar a diseño" no dispara el aviso general de NOT-03,
// exactamente como en el original. Centralización del asunto (2026-08-05):
// el original no llevaba el prefijo `ASUNTO_BASE` aquí, a diferencia de los
// otros dos generadores — inconsistencia real detectada al centralizarlo,
// corregida para que los tres se comporten igual.
export function buildAsignacionNotificacion(ctx: { codSap: string; nombreEmpresa: string | null; disenadorEmail: string }): NotifMensaje {
  return {
    destinatario: ctx.disenadorEmail,
    asunto: `${ASUNTO_BASE} Nueva portada asignada — ${ctx.codSap}`,
    cuerpo: `Se te ha asignado la solicitud de portada para ${ctx.codSap} (${ctx.nombreEmpresa || ""}). Accede a la herramienta para ver los detalles.`,
  };
}

// Réplica del aviso de mención en un comentario de addComentario()
// (~3393-3405, COM-07): un mensaje por mencionado, excluyendo siempre al
// propio autor del comentario (resuelto por el llamador antes de invocar
// esto, filtrando por id).
export function buildMencionNotificacion(ctx: { autorNombre: string | null; codSap: string; texto: string; destinatarioEmail: string }): NotifMensaje {
  return {
    destinatario: ctx.destinatarioEmail,
    asunto: `${ASUNTO_BASE} ${ctx.autorNombre ?? ""} te ha mencionado`,
    cuerpo: `${ctx.autorNombre ?? ""} te ha mencionado en un comentario de la solicitud ${ctx.codSap}:\n\n"${ctx.texto}"`,
  };
}

export type NotifEntrega = { crear: boolean; entregada: boolean };

// H-03/NOT-12: decide, para un destinatario concreto, si la notificación se
// crea y si cuenta como ya entregada — según su `notif_preferencia`
// (perfiles.notif_preferencia, default 'ambas' en la base de datos):
// - 'ninguna': no se crea ningún registro — no recibe nada.
// - 'email': **decisión pendiente, sin cambiar a propósito** (2026-08-05):
//   ahora que el envío real existe (Outbox + `send-notifications`), "solo
//   email, sin panel" ya sería técnicamente posible, pero requiere poder
//   distinguir "visible en la herramienta" de "hay que enviarlo" — hoy es
//   un único booleano (`enviado`/`crear`) que no permite las dos cosas a la
//   vez. Hasta que se decida ese modelo, se mantiene el comportamiento
//   anterior: no se crea ningún registro.
// - 'herramienta': se crea y se marca como ya entregada (nada más pendiente).
// - 'ambas' (y cualquier valor no reconocido, igual que el default de la
//   columna): se crea, visible en la herramienta, y NO se marca como
//   entregada — queda pendiente en la cola para que `send-notifications`
//   la envíe por email de verdad.
export function resolverEntrega(preferencia: string | null | undefined): NotifEntrega {
  switch (preferencia) {
    case "ninguna":
    case "email":
      return { crear: false, entregada: false };
    case "herramienta":
      return { crear: true, entregada: true };
    default:
      return { crear: true, entregada: false };
  }
}
