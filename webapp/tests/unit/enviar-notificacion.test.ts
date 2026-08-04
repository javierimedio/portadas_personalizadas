import { describe, expect, it } from "vitest";
import { buildAsignacionNotificacion, buildNotificaciones, type NotifRecipients } from "@/features/notificaciones/domain/enviar-notificacion";

function ctx(overrides: Partial<NotifRecipients> = {}): NotifRecipients {
  return {
    codSap: "60239",
    nombreEmpresa: "ACME",
    comercialNombre: "Juan Pérez",
    comercialEmail: "juan@gor.es",
    mktAdminEmails: ["mkt1@gor.es", "mkt2@gor.es"],
    disenadorEmails: ["dis1@gor.es", "dis2@gor.es"],
    ...overrides,
  };
}

describe("buildNotificaciones", () => {
  it("enviada/en_revision_marketing: notifica a marketing+admin y al comercial", () => {
    const notifs = buildNotificaciones("enviada", ctx());
    expect(notifs.map((n) => n.destinatario)).toEqual(["mkt1@gor.es", "mkt2@gor.es", "juan@gor.es"]);
    expect(buildNotificaciones("en_revision_marketing", ctx())).toEqual(notifs);
  });

  it("en_diseno: comercial+mktAdmin y todos los disenadores", () => {
    const notifs = buildNotificaciones("en_diseno", ctx());
    expect(notifs.map((n) => n.destinatario)).toEqual(["juan@gor.es", "mkt1@gor.es", "mkt2@gor.es", "dis1@gor.es", "dis2@gor.es"]);
    expect(notifs[0]?.asunto).toContain("En diseño");
    expect(notifs[3]?.asunto).toContain("Nueva tarea de diseño");
  });

  it("diseno_en_revision_comercial: comercial+mktAdmin", () => {
    expect(buildNotificaciones("diseno_en_revision_comercial", ctx()).map((n) => n.destinatario)).toEqual([
      "juan@gor.es",
      "mkt1@gor.es",
      "mkt2@gor.es",
    ]);
  });

  it("modificar_diseno: solo disenadores", () => {
    expect(buildNotificaciones("modificar_diseno", ctx()).map((n) => n.destinatario)).toEqual(["dis1@gor.es", "dis2@gor.es"]);
  });

  it("confirmada: comercial+mktAdmin", () => {
    expect(buildNotificaciones("confirmada", ctx()).map((n) => n.destinatario)).toEqual(["juan@gor.es", "mkt1@gor.es", "mkt2@gor.es"]);
  });

  it("borrador: solo el comercial", () => {
    expect(buildNotificaciones("borrador", ctx()).map((n) => n.destinatario)).toEqual(["juan@gor.es"]);
  });

  it("archivada: sin caso en el switch, no genera notificaciones", () => {
    expect(buildNotificaciones("archivada", ctx())).toEqual([]);
  });

  it("deduplica destinatarios repetidos (NOT-08) — un email que aparece en dos grupos solo recibe un mensaje por push()", () => {
    const notifs = buildNotificaciones("en_diseno", ctx({ comercialEmail: "mkt1@gor.es" }));
    const primerMensaje = notifs.filter((n) => n.destinatario === "mkt1@gor.es");
    expect(primerMensaje).toHaveLength(1);
  });

  it("ignora emails nulos/vacíos", () => {
    const notifs = buildNotificaciones("borrador", ctx({ comercialEmail: null }));
    expect(notifs).toEqual([]);
  });
});

describe("buildAsignacionNotificacion", () => {
  it("mensaje único al diseñador asignado", () => {
    const n = buildAsignacionNotificacion({ codSap: "60239", nombreEmpresa: "ACME", disenadorEmail: "dis1@gor.es" });
    expect(n.destinatario).toBe("dis1@gor.es");
    expect(n.asunto).toBe("Nueva portada asignada — 60239");
    expect(n.cuerpo).toContain("ACME");
  });
});
