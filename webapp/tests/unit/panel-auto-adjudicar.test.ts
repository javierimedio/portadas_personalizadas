import { describe, expect, it } from "vitest";
import { computeAdjudicaciones, type AdjudicarSolicitud } from "@/features/panel-global/domain/auto-adjudicar";

function sol(overrides: Partial<AdjudicarSolicitud> = {}): AdjudicarSolicitud {
  return {
    id: "1",
    provincia: "Madrid",
    created_at: "2026-01-01T00:00:00Z",
    solicitud_catalogos: [],
    ...overrides,
  };
}

function catRoly(overrides: Partial<AdjudicarSolicitud["solicitud_catalogos"][number]> = {}) {
  return {
    catalogo: "roly",
    portada_personalizada: true,
    portada_diseno_propio: false,
    portada_elegida: null,
    portada_opcion_1: "Playa",
    portada_opcion_2: "Montaña",
    portada_opcion_3: "Ciudad",
    ...overrides,
  };
}

describe("computeAdjudicaciones", () => {
  it("adjudica la primera opción libre por antigüedad", () => {
    const { adjudicaciones, sinOpciones } = computeAdjudicaciones([sol({ id: "a", solicitud_catalogos: [catRoly()] })]);
    expect(adjudicaciones).toEqual([{ solicitudId: "a", catalogo: "roly", portadaElegida: "Playa" }]);
    expect(sinOpciones).toBe(0);
  });

  it("evita repetir la misma portada para dos clientes de la misma provincia", () => {
    const sols = [
      sol({ id: "a", provincia: "Madrid", created_at: "2026-01-01T00:00:00Z", solicitud_catalogos: [catRoly()] }),
      sol({ id: "b", provincia: "Madrid", created_at: "2026-01-02T00:00:00Z", solicitud_catalogos: [catRoly()] }),
    ];
    const { adjudicaciones } = computeAdjudicaciones(sols);
    expect(adjudicaciones.find((a) => a.solicitudId === "a")?.portadaElegida).toBe("Playa");
    expect(adjudicaciones.find((a) => a.solicitudId === "b")?.portadaElegida).toBe("Montaña");
  });

  it("la misma portada sí se puede repetir en provincias distintas", () => {
    const sols = [
      sol({ id: "a", provincia: "Madrid", solicitud_catalogos: [catRoly()] }),
      sol({ id: "b", provincia: "Barcelona", solicitud_catalogos: [catRoly()] }),
    ];
    const { adjudicaciones } = computeAdjudicaciones(sols);
    expect(adjudicaciones.find((a) => a.solicitudId === "a")?.portadaElegida).toBe("Playa");
    expect(adjudicaciones.find((a) => a.solicitudId === "b")?.portadaElegida).toBe("Playa");
  });

  it("ordena por antigüedad: la más antigua tiene prioridad sobre la primera opción", () => {
    const sols = [
      sol({ id: "nueva", provincia: "Madrid", created_at: "2026-02-01T00:00:00Z", solicitud_catalogos: [catRoly()] }),
      sol({ id: "vieja", provincia: "Madrid", created_at: "2026-01-01T00:00:00Z", solicitud_catalogos: [catRoly()] }),
    ];
    const { adjudicaciones } = computeAdjudicaciones(sols);
    expect(adjudicaciones.find((a) => a.solicitudId === "vieja")?.portadaElegida).toBe("Playa");
    expect(adjudicaciones.find((a) => a.solicitudId === "nueva")?.portadaElegida).toBe("Montaña");
  });

  it("sin opciones disponibles: cuenta sinOpciones y no adjudica", () => {
    const sols = [
      sol({ id: "a", provincia: "Madrid", created_at: "2026-01-01T00:00:00Z", solicitud_catalogos: [catRoly({ portada_opcion_2: null, portada_opcion_3: null })] }),
      sol({ id: "b", provincia: "Madrid", created_at: "2026-01-02T00:00:00Z", solicitud_catalogos: [catRoly({ portada_opcion_2: null, portada_opcion_3: null })] }),
    ];
    const { adjudicaciones, sinOpciones } = computeAdjudicaciones(sols);
    expect(adjudicaciones).toHaveLength(1);
    expect(sinOpciones).toBe(1);
  });

  it("ignora catálogos con diseño propio, ya con portada elegida, o sin portada personalizada", () => {
    const sols = [
      sol({ id: "a", solicitud_catalogos: [catRoly({ portada_diseno_propio: true })] }),
      sol({ id: "b", solicitud_catalogos: [catRoly({ portada_elegida: "Ya elegida" })] }),
      sol({ id: "c", solicitud_catalogos: [catRoly({ portada_personalizada: false })] }),
    ];
    expect(computeAdjudicaciones(sols).adjudicaciones).toEqual([]);
  });

  it("excluye XMAS del reparto automático", () => {
    const sols = [sol({ solicitud_catalogos: [catRoly({ catalogo: "xmas" })] })];
    expect(computeAdjudicaciones(sols).adjudicaciones).toEqual([]);
  });
});
