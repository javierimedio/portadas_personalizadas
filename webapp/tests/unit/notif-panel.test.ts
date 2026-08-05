import { describe, expect, it } from "vitest";
import { badgeTexto, contarNoLeidas, truncarCuerpo, type NotificacionItem } from "@/features/notificaciones/domain/panel";

function n(overrides: Partial<NotificacionItem> = {}): NotificacionItem {
  return { id: "1", solicitud_id: "s1", asunto: "Asunto", cuerpo: "Cuerpo", created_at: "2026-01-01T00:00:00Z", ...overrides };
}

describe("contarNoLeidas", () => {
  it("cuenta solo las que no están en el set de leídas", () => {
    const notifs = [n({ id: "a" }), n({ id: "b" }), n({ id: "c" })];
    expect(contarNoLeidas(notifs, new Set(["a"]))).toBe(2);
    expect(contarNoLeidas(notifs, new Set(["a", "b", "c"]))).toBe(0);
    expect(contarNoLeidas(notifs, new Set())).toBe(3);
  });
});

describe("badgeTexto", () => {
  it("muestra el número tal cual hasta 9, y '9+' por encima", () => {
    expect(badgeTexto(0)).toBe("0");
    expect(badgeTexto(9)).toBe("9");
    expect(badgeTexto(10)).toBe("9+");
    expect(badgeTexto(37)).toBe("9+");
  });
});

describe("truncarCuerpo", () => {
  it("corta a 80 caracteres por defecto", () => {
    const largo = "a".repeat(100);
    expect(truncarCuerpo(largo)).toHaveLength(80);
  });

  it("deja intacto un cuerpo corto", () => {
    expect(truncarCuerpo("hola")).toBe("hola");
  });

  it("cuerpo vacío/nulo no rompe", () => {
    expect(truncarCuerpo("")).toBe("");
  });
});
