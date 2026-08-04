// Réplica de enviarNotificacion() (index.html ~5561-5649): el switch/case
// que decide destinatarios y textos por transición de estado (NOT-02 a
// NOT-08). Aquí es una función pura — la resolución de emails reales
// (perfiles, comercial, diseñadores) vive en la capa de aplicación, que ya
// tiene acceso a Supabase. `enviado`/`enviado_at` no se modelan aquí: en el
// original siempre se guardan como `false`/`null` (el flag `solo_herramienta`
// que los activaría nunca se asigna — docs/03-modelo-datos.md § 3.4.3), así
// que la capa de aplicación los inserta ya fijos, sin necesidad de calcularlos.
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
  const base = `[Portadas GOR] ${ctx.codSap}`;
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
// exactamente como en el original.
export function buildAsignacionNotificacion(ctx: { codSap: string; nombreEmpresa: string | null; disenadorEmail: string }): NotifMensaje {
  return {
    destinatario: ctx.disenadorEmail,
    asunto: `Nueva portada asignada — ${ctx.codSap}`,
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
    asunto: `[Portadas GOR] ${ctx.autorNombre ?? ""} te ha mencionado`,
    cuerpo: `${ctx.autorNombre ?? ""} te ha mencionado en un comentario de la solicitud ${ctx.codSap}:\n\n"${ctx.texto}"`,
  };
}
