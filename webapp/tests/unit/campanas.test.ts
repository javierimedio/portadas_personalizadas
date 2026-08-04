import { describe, expect, it } from "vitest";
import { campanaCerrada, getDefaultCampanaId } from "@/shared/domain/campanas";

describe("campanaCerrada", () => {
  it("sin fecha de cierre, nunca está cerrada", () => {
    expect(campanaCerrada(null)).toBe(false);
  });

  it("cierra al final del día de la fecha (23:59:59), no a las 00:00", () => {
    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(campanaCerrada(ayer)).toBe(true);
  });

  it("una fecha futura no está cerrada", () => {
    const manana = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(campanaCerrada(manana)).toBe(false);
  });
});

describe("getDefaultCampanaId", () => {
  it("sin campañas, devuelve cadena vacía", () => {
    expect(getDefaultCampanaId([])).toBe("");
  });

  it("entre las activas, elige la de fecha de cierre más lejana", () => {
    const campanas = [
      { id: "a", activa: true, fecha_cierre: "2026-01-10" },
      { id: "b", activa: true, fecha_cierre: "2026-06-30" },
      { id: "c", activa: false, fecha_cierre: "2026-12-31" },
    ];
    expect(getDefaultCampanaId(campanas)).toBe("b");
  });

  it("una campaña activa sin fecha cuenta como la más antigua, no como sin límite", () => {
    const campanas = [
      { id: "a", activa: true, fecha_cierre: null },
      { id: "b", activa: true, fecha_cierre: "2026-01-10" },
    ];
    expect(getDefaultCampanaId(campanas)).toBe("b");
  });
});
