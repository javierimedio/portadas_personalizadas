import { describe, expect, it } from "vitest";
import { buildPortadaStats } from "@/features/dashboard/domain/portada-stats";
import { isPortadaCorrupta, PORTADA_CORRUPT_RE } from "@/shared/domain/portadas-validacion";
import type { Solicitud, CatDef, SolicitudCatalogo } from "@/features/dashboard/domain/dashboard-stats";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSol(
  overrides: Partial<Solicitud> & { solicitud_catalogos: SolicitudCatalogo[] }
): Solicitud {
  return {
    id: "sol-1",
    cod_sap: "12345",
    estado: "en_revision_marketing",
    campana_id: "camp-1",
    comercial_id: null,
    idioma: null,
    canal: null,
    comercial_nombre: null,
    comercial_codigo: null,
    ...overrides,
  };
}

function makeCat(
  catalogo: string,
  portada_personalizada: boolean | null,
  portada_elegida?: string | null,
  portada_diseno_propio?: boolean | null
): SolicitudCatalogo {
  return {
    catalogo,
    unidades: null,
    catalogo_digital: null,
    catalogo_impreso: null,
    portada_personalizada,
    con_precios: null,
    portada_elegida: portada_elegida ?? null,
    portada_diseno_propio: portada_diseno_propio ?? null,
  };
}

const CATS: CatDef[] = [{ key: "roly", label: "ROLY" }];
const CATS_MULTI: CatDef[] = [
  { key: "roly", label: "ROLY" },
  { key: "roly_wrk", label: "ROLY WRK" },
];

// ── isPortadaCorrupta ─────────────────────────────────────────────────────────

describe("isPortadaCorrupta", () => {
  it("detecta patrones corruptos canónicos", () => {
    expect(isPortadaCorrupta("25532_roly")).toBe(true);
    expect(isPortadaCorrupta("29_wrk")).toBe(true);
    expect(isPortadaCorrupta("66732_stm")).toBe(true);
    expect(isPortadaCorrupta("12_stamina")).toBe(true);
    expect(isPortadaCorrupta("99_xmas")).toBe(true);
  });

  it("es insensible a mayúsculas", () => {
    expect(isPortadaCorrupta("25532_ROLY")).toBe(true);
    expect(isPortadaCorrupta("29_WRK")).toBe(true);
  });

  it("no clasifica como corrupto un número simple (portada válida)", () => {
    expect(isPortadaCorrupta("12")).toBe(false);
    expect(isPortadaCorrupta("25")).toBe(false);
  });

  it("no clasifica como corrupto texto libre (portada válida)", () => {
    expect(isPortadaCorrupta("Playa")).toBe(false);
    expect(isPortadaCorrupta("Montaña")).toBe(false);
    expect(isPortadaCorrupta("P01")).toBe(false);
  });

  it("no clasifica como corrupto texto con sufijo desconocido", () => {
    expect(isPortadaCorrupta("25532_otro")).toBe(false);
    expect(isPortadaCorrupta("roly_25532")).toBe(false); // orden invertido
  });
});

// ── Verificación del contrato de PORTADA_CORRUPT_RE ──────────────────────────

describe("PORTADA_CORRUPT_RE (contrato del patrón)", () => {
  it("exporta la misma regex que usa isPortadaCorrupta", () => {
    expect(PORTADA_CORRUPT_RE.test("12345_roly")).toBe(true);
    expect(PORTADA_CORRUPT_RE.test("12")).toBe(false);
  });
});

// ── buildPortadaStats — casos base ───────────────────────────────────────────

describe("buildPortadaStats — portada_personalizada = false → excluir completamente", () => {
  it("no cuenta la solicitud si portada_personalizada es false", () => {
    const sols = [makeSol({ solicitud_catalogos: [makeCat("roly", false, "12")] })];
    const [roly] = buildPortadaStats(sols, CATS);
    expect(roly!.ranking).toHaveLength(0);
    expect(roly!.totalValidas).toBe(0);
    expect(roly!.disenoPropioCount).toBe(0);
    expect(roly!.sinAdjudicarCount).toBe(0);
    expect(roly!.invalidosCount).toBe(0);
  });

  it("no cuenta si portada_personalizada es null", () => {
    const sols = [makeSol({ solicitud_catalogos: [makeCat("roly", null, "12")] })];
    const [roly] = buildPortadaStats(sols, CATS);
    expect(roly!.ranking).toHaveLength(0);
    expect(roly!.totalValidas).toBe(0);
  });

  it("no cuenta si no hay fila para el catálogo", () => {
    const sols = [makeSol({ solicitud_catalogos: [] })];
    const [roly] = buildPortadaStats(sols, CATS);
    expect(roly!.ranking).toHaveLength(0);
    expect(roly!.totalValidas).toBe(0);
  });
});

describe("buildPortadaStats — estados excluidos", () => {
  it("excluye solicitudes en borrador", () => {
    const sols = [makeSol({ estado: "borrador", solicitud_catalogos: [makeCat("roly", true, "12")] })];
    const [roly] = buildPortadaStats(sols, CATS);
    expect(roly!.totalValidas).toBe(0);
    expect(roly!.ranking).toHaveLength(0);
  });

  it("excluye solicitudes archivadas", () => {
    const sols = [makeSol({ estado: "archivada", solicitud_catalogos: [makeCat("roly", true, "12")] })];
    const [roly] = buildPortadaStats(sols, CATS);
    expect(roly!.totalValidas).toBe(0);
  });

  it("incluye solicitudes en en_diseno", () => {
    const sols = [makeSol({ estado: "en_diseno", solicitud_catalogos: [makeCat("roly", true, "12")] })];
    const [roly] = buildPortadaStats(sols, CATS);
    expect(roly!.totalValidas).toBe(1);
  });

  it("incluye solicitudes en confirmada", () => {
    const sols = [makeSol({ estado: "confirmada", solicitud_catalogos: [makeCat("roly", true, "25")] })];
    const [roly] = buildPortadaStats(sols, CATS);
    expect(roly!.totalValidas).toBe(1);
  });

  it("incluye todas las solicitudes enviadas en cualquier estado intermedio", () => {
    const estados = ["enviada", "en_revision_marketing", "en_diseno", "pendiente_comercial", "diseno_en_revision_comercial", "modificar_diseno", "confirmada"];
    const sols = estados.map((estado, i) =>
      makeSol({ id: `sol-${i}`, estado, solicitud_catalogos: [makeCat("roly", true, "12")] })
    );
    const [roly] = buildPortadaStats(sols, CATS);
    expect(roly!.totalValidas).toBe(estados.length);
  });
});

describe("buildPortadaStats — clasificación de cada fila", () => {
  it("portada válida → ranking con total y pct", () => {
    const sols = [makeSol({ solicitud_catalogos: [makeCat("roly", true, "12")] })];
    const [roly] = buildPortadaStats(sols, CATS);
    expect(roly!.ranking).toHaveLength(1);
    expect(roly!.ranking[0]!.portada).toBe("12");
    expect(roly!.ranking[0]!.total).toBe(1);
    expect(roly!.ranking[0]!.pct).toBe(100);
    expect(roly!.totalValidas).toBe(1);
    expect(roly!.disenoPropioCount).toBe(0);
    expect(roly!.sinAdjudicarCount).toBe(0);
    expect(roly!.invalidosCount).toBe(0);
  });

  it("diseño propio → disenoPropioCount, NO en ranking", () => {
    const sols = [makeSol({ solicitud_catalogos: [makeCat("roly", true, null, true)] })];
    const [roly] = buildPortadaStats(sols, CATS);
    expect(roly!.disenoPropioCount).toBe(1);
    expect(roly!.ranking).toHaveLength(0);
    expect(roly!.totalValidas).toBe(0);
  });

  it("portada_elegida null → sinAdjudicarCount, NO en ranking", () => {
    const sols = [makeSol({ solicitud_catalogos: [makeCat("roly", true, null)] })];
    const [roly] = buildPortadaStats(sols, CATS);
    expect(roly!.sinAdjudicarCount).toBe(1);
    expect(roly!.ranking).toHaveLength(0);
    expect(roly!.totalValidas).toBe(0);
  });

  it("portada_elegida vacía ('') → sinAdjudicarCount (no genera entradas vacías)", () => {
    const sols = [makeSol({ solicitud_catalogos: [makeCat("roly", true, "")] })];
    const [roly] = buildPortadaStats(sols, CATS);
    expect(roly!.sinAdjudicarCount).toBe(1);
    expect(roly!.ranking).toHaveLength(0);
  });

  it("valor corrupto → invalidosCount + detalle, NO en ranking", () => {
    const sols = [makeSol({ id: "sol-x", cod_sap: "99999", solicitud_catalogos: [makeCat("roly", true, "99999_roly")] })];
    const [roly] = buildPortadaStats(sols, CATS);
    expect(roly!.invalidosCount).toBe(1);
    expect(roly!.ranking).toHaveLength(0);
    expect(roly!.totalValidas).toBe(0);
    const det = roly!.invalidosDetalle[0]!;
    expect(det.solicitudId).toBe("sol-x");
    expect(det.codSap).toBe("99999");
    expect(det.catalogo).toBe("roly");
    expect(det.portadaElegida).toBe("99999_roly");
    expect(det.estado).toBe("en_revision_marketing");
  });
});

// ── Ranking — orden y porcentajes ────────────────────────────────────────────

describe("buildPortadaStats — ranking ordenado y porcentajes", () => {
  it("ordena descendente por total de solicitudes", () => {
    const sols = [
      makeSol({ id: "s1", solicitud_catalogos: [makeCat("roly", true, "25")] }),
      makeSol({ id: "s2", solicitud_catalogos: [makeCat("roly", true, "12")] }),
      makeSol({ id: "s3", solicitud_catalogos: [makeCat("roly", true, "12")] }),
      makeSol({ id: "s4", solicitud_catalogos: [makeCat("roly", true, "67")] }),
    ];
    const [roly] = buildPortadaStats(sols, CATS);
    expect(roly!.ranking[0]!.portada).toBe("12");
    expect(roly!.ranking[0]!.total).toBe(2);
    expect(roly!.ranking[1]!.portada).toBe("25");
    expect(roly!.ranking[1]!.total).toBe(1);
    expect(roly!.ranking[2]!.portada).toBe("67");
    expect(roly!.ranking[2]!.total).toBe(1);
  });

  it("porcentaje calculado sobre totalValidas del catálogo, no el global", () => {
    const sols = [
      makeSol({ id: "s1", solicitud_catalogos: [makeCat("roly", true, "12")] }),
      makeSol({ id: "s2", solicitud_catalogos: [makeCat("roly", true, "12")] }),
      makeSol({ id: "s3", solicitud_catalogos: [makeCat("roly", true, "25")] }),
      // Esta cuarta tiene portada_personalizada=false → excluida del denominador
      makeSol({ id: "s4", solicitud_catalogos: [makeCat("roly", false, "12")] }),
    ];
    const [roly] = buildPortadaStats(sols, CATS);
    // totalValidas = 3 (s4 excluida)
    expect(roly!.totalValidas).toBe(3);
    const portada12 = roly!.ranking.find((e) => e.portada === "12")!;
    const portada25 = roly!.ranking.find((e) => e.portada === "25")!;
    expect(portada12.pct).toBe(67); // round(2/3*100)
    expect(portada25.pct).toBe(33); // round(1/3*100)
  });

  it("portada con 100% cuando solo hay una portada válida", () => {
    const sols = [makeSol({ solicitud_catalogos: [makeCat("roly", true, "42")] })];
    const [roly] = buildPortadaStats(sols, CATS);
    expect(roly!.ranking[0]!.pct).toBe(100);
  });

  it("no genera entradas duplicadas para la misma portada", () => {
    const sols = [
      makeSol({ id: "s1", solicitud_catalogos: [makeCat("roly", true, "12")] }),
      makeSol({ id: "s2", solicitud_catalogos: [makeCat("roly", true, "12")] }),
      makeSol({ id: "s3", solicitud_catalogos: [makeCat("roly", true, "12")] }),
    ];
    const [roly] = buildPortadaStats(sols, CATS);
    expect(roly!.ranking).toHaveLength(1);
    expect(roly!.ranking[0]!.portada).toBe("12");
    expect(roly!.ranking[0]!.total).toBe(3);
  });
});

// ── Clave (solicitud_id, catálogo) — contabilizado como máximo una vez ───────

describe("buildPortadaStats — cada (solicitud_id, catálogo) cuenta como máximo una vez", () => {
  it("si una solicitud tiene dos filas para el mismo catálogo (caso degenerado), solo se cuenta la primera", () => {
    const solConDuplicado = makeSol({
      solicitud_catalogos: [
        makeCat("roly", true, "12"),
        makeCat("roly", true, "25"), // duplicado — no debería ocurrir en BD
      ],
    });
    const [roly] = buildPortadaStats([solConDuplicado], CATS);
    // .find() devuelve solo la primera → portada "12" con total=1
    expect(roly!.totalValidas).toBe(1);
    expect(roly!.ranking[0]!.portada).toBe("12");
    expect(roly!.ranking[0]!.total).toBe(1);
    expect(roly!.ranking.find((e) => e.portada === "25")).toBeUndefined();
  });
});

// ── Múltiples catálogos — independientes entre sí ────────────────────────────

describe("buildPortadaStats — catálogos independientes", () => {
  it("las portadas de ROLY no afectan el ranking de ROLY WRK", () => {
    const sols = [
      makeSol({
        id: "s1",
        solicitud_catalogos: [
          makeCat("roly", true, "12"),
          makeCat("roly_wrk", true, "3"),
        ],
      }),
      makeSol({
        id: "s2",
        solicitud_catalogos: [
          makeCat("roly", true, "12"),
          makeCat("roly_wrk", true, "29"),
        ],
      }),
    ];
    const [roly, rolyWrk] = buildPortadaStats(sols, CATS_MULTI);
    expect(roly!.totalValidas).toBe(2);
    expect(roly!.ranking[0]!.portada).toBe("12");
    expect(rolyWrk!.totalValidas).toBe(2);
    const portadas = rolyWrk!.ranking.map((e) => e.portada);
    expect(portadas).toContain("3");
    expect(portadas).toContain("29");
    expect(portadas).not.toContain("12");
  });

  it("porcentajes son independientes por catálogo", () => {
    const sols = [
      makeSol({
        id: "s1",
        solicitud_catalogos: [
          makeCat("roly", true, "12"),
          makeCat("roly_wrk", true, "3"),
        ],
      }),
      makeSol({
        id: "s2",
        solicitud_catalogos: [
          makeCat("roly", true, "12"),
          makeCat("roly_wrk", true, "3"),
        ],
      }),
      makeSol({
        id: "s3",
        solicitud_catalogos: [
          makeCat("roly", true, "25"),
          // roly_wrk solo tiene 2 solicitudes con portada 3
        ],
      }),
    ];
    const [roly, rolyWrk] = buildPortadaStats(sols, CATS_MULTI);
    // ROLY: portada 12 = 2/3 = 67%, portada 25 = 1/3 = 33%
    expect(roly!.ranking.find((e) => e.portada === "12")!.pct).toBe(67);
    // ROLY WRK: portada 3 = 2/2 = 100%
    expect(rolyWrk!.ranking[0]!.pct).toBe(100);
  });
});

// ── Casos especiales ──────────────────────────────────────────────────────────

describe("buildPortadaStats — casos especiales", () => {
  it("sin solicitudes → resultado vacío con zeros", () => {
    const [roly] = buildPortadaStats([], CATS);
    expect(roly!.ranking).toHaveLength(0);
    expect(roly!.totalValidas).toBe(0);
    expect(roly!.disenoPropioCount).toBe(0);
    expect(roly!.sinAdjudicarCount).toBe(0);
    expect(roly!.invalidosCount).toBe(0);
  });

  it("mezcla de válidas, diseño propio, sin adjudicar e inválidas", () => {
    const sols = [
      makeSol({ id: "s1", solicitud_catalogos: [makeCat("roly", true, "12")] }),
      makeSol({ id: "s2", solicitud_catalogos: [makeCat("roly", true, "12")] }),
      makeSol({ id: "s3", solicitud_catalogos: [makeCat("roly", true, null, true)] }), // diseño propio
      makeSol({ id: "s4", solicitud_catalogos: [makeCat("roly", true, null)] }), // sin adjudicar
      makeSol({ id: "s5", solicitud_catalogos: [makeCat("roly", true, "11111_roly")] }), // corrupto
    ];
    const [roly] = buildPortadaStats(sols, CATS);
    expect(roly!.totalValidas).toBe(2);
    expect(roly!.disenoPropioCount).toBe(1);
    expect(roly!.sinAdjudicarCount).toBe(1);
    expect(roly!.invalidosCount).toBe(1);
    expect(roly!.ranking[0]!.portada).toBe("12");
    expect(roly!.ranking[0]!.total).toBe(2);
    expect(roly!.ranking[0]!.pct).toBe(100);
  });

  it("cod_sap null se expone como null en invalidosDetalle", () => {
    const sol = makeSol({
      id: "sol-sin-sap",
      cod_sap: null,
      solicitud_catalogos: [makeCat("roly", true, "12345_roly")],
    });
    const [roly] = buildPortadaStats([sol], CATS);
    expect(roly!.invalidosDetalle[0]!.codSap).toBeNull();
  });

  it("devuelve cats.label correcto en cada resultado", () => {
    const [roly, rolyWrk] = buildPortadaStats([], CATS_MULTI);
    expect(roly!.label).toBe("ROLY");
    expect(rolyWrk!.label).toBe("ROLY WRK");
  });
});
