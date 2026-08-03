import { describe, expect, it } from "vitest";
import { buildDisenoCsv, disenoCsvFilename, filasParaCsv, type DisenoCsvRow } from "@/features/diseno/domain/csv";

function row(overrides: Partial<DisenoCsvRow> = {}): DisenoCsvRow {
  return {
    cod_sap: "60239",
    estado: "en_diseno",
    campana_id: "c1",
    asignado_id: "d1",
    solicitud_catalogos: [],
    ...overrides,
  };
}

describe("filasParaCsv", () => {
  const rows = [
    row({ cod_sap: "a", estado: "en_diseno", campana_id: "c1", asignado_id: "d1" }),
    row({ cod_sap: "b", estado: "modificar_diseno", campana_id: "c2", asignado_id: "d2" }),
    row({ cod_sap: "c", estado: "borrador", campana_id: "c1" }),
  ];

  it("solo en_diseno/modificar_diseno", () => {
    expect(filasParaCsv(rows, "", null, null).map((r) => r.cod_sap)).toEqual(["a", "b"]);
  });

  it("filtra por campaña seleccionada", () => {
    expect(filasParaCsv(rows, "c2", null, null).map((r) => r.cod_sap)).toEqual(["b"]);
  });

  it("un disenador siempre exporta solo lo suyo, aunque no haya filtrado el selector", () => {
    expect(filasParaCsv(rows, "", "disenador", "d1").map((r) => r.cod_sap)).toEqual(["a"]);
  });

  it("responsable_diseno no se restringe a sí mismo", () => {
    expect(filasParaCsv(rows, "", "responsable_diseno", "d1").map((r) => r.cod_sap)).toEqual(["a", "b"]);
  });
});

describe("buildDisenoCsv", () => {
  it("cabecera fija CODIGO/ROLY/WRK/STM/XMAS con TAB y BOM", () => {
    const csv = buildDisenoCsv([]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe("CODIGO\tROLY\tWRK\tSTM\tXMAS");
  });

  it("PROPIO si diseño propio, portada_elegida si existe, sino portada_opcion_1, vacío si no personalizada", () => {
    const csv = buildDisenoCsv([
      row({
        cod_sap: "60239",
        solicitud_catalogos: [
          { catalogo: "roly", portada_personalizada: true, portada_diseno_propio: false, portada_opcion_1: "Playa", portada_elegida: null },
          { catalogo: "roly_wrk", portada_personalizada: true, portada_diseno_propio: true, portada_opcion_1: "X", portada_elegida: null },
          { catalogo: "stamina", portada_personalizada: true, portada_diseno_propio: false, portada_opcion_1: "A", portada_elegida: "B" },
          { catalogo: "xmas", portada_personalizada: false, portada_diseno_propio: false, portada_opcion_1: "Y", portada_elegida: null },
        ],
      }),
    ]);
    const dataLine = csv.split("\n")[1];
    expect(dataLine).toBe("60239\tPlaya\tPROPIO\tB\t");
  });
});

describe("disenoCsvFilename", () => {
  it("usa 'portadas' si no hay campaña", () => {
    expect(disenoCsvFilename(null, "2026-08-03")).toBe("diseno_portadas_2026-08-03.csv");
  });

  it("usa el nombre de la campaña si existe", () => {
    expect(disenoCsvFilename("Navidad 2026", "2026-08-03")).toBe("diseno_Navidad 2026_2026-08-03.csv");
  });
});
