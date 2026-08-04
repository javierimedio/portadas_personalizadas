import { afterEach, describe, expect, it, vi } from "vitest";
import { activeCampanaId, campanaBanner, campanaCerrada, getDefaultCampanaId } from "@/shared/domain/campanas";

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

describe("activeCampanaId", () => {
  const campanas = [
    { id: "a", activa: true, fecha_cierre: "2026-01-10" },
    { id: "b", activa: true, fecha_cierre: "2026-06-30" },
    { id: "c", activa: false, fecha_cierre: "2026-12-31" },
  ];

  it("respeta la selección de sesión si sigue siendo una campaña activa (corrección de H-12)", () => {
    expect(activeCampanaId(campanas, "a")).toBe("a");
  });

  it("ignora la selección si la campaña ya no está activa", () => {
    expect(activeCampanaId(campanas, "c")).toBe("b");
  });

  it("sin selección, cae al default algorítmico", () => {
    expect(activeCampanaId(campanas, null)).toBe("b");
    expect(activeCampanaId(campanas, undefined)).toBe("b");
  });

  it("selección apuntando a un id inexistente, cae al default", () => {
    expect(activeCampanaId(campanas, "no-existe")).toBe("b");
  });
});

describe("campanaBanner", () => {
  it("sin fecha de cierre, sin banner", () => {
    expect(campanaBanner({ nombre: "X", fecha_cierre: null })).toBeNull();
  });

  it("nulo, sin banner", () => {
    expect(campanaBanner(null)).toBeNull();
  });

  it("cerrada: variante 'cerrada' con el nombre y la fecha", () => {
    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const b = campanaBanner({ nombre: "Navidad 2026", fecha_cierre: ayer });
    expect(b?.variant).toBe("cerrada");
    expect(b?.mensaje).toContain("Navidad 2026");
  });

  describe("con la hora del sistema fijada a medianoche (para un cálculo de días exacto)", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("cierra en varios días: plural", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-08-01T00:00:00"));
      // hoy 00:00:00 → cierre 23:59:59 del día 4 = 3 días y 23:59:59 restantes, ceil = 4.
      const b = campanaBanner({ nombre: "Navidad 2026", fecha_cierre: "2026-08-04" });
      expect(b?.variant).toBe("porcerrar");
      expect(b?.mensaje).toContain("4 días.");
    });

    it("cierra hoy mismo: singular", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-08-01T00:00:00"));
      // hoy 00:00:00 → cierre 23:59:59 del mismo día = menos de 1 día, ceil = 1.
      const b = campanaBanner({ nombre: "Navidad 2026", fecha_cierre: "2026-08-01" });
      expect(b?.variant).toBe("porcerrar");
      expect(b?.mensaje).toContain("1 día.");
    });
  });

  it("cierra en más de 7 días: sin banner", () => {
    const en30dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(campanaBanner({ nombre: "Navidad 2026", fecha_cierre: en30dias })).toBeNull();
  });
});
