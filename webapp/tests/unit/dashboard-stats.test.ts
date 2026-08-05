import { describe, expect, it } from "vitest";
import {
  ALL_CATS,
  catsForDashboard,
  computeKpis,
  filterByResponsableCanal,
  fmtNum,
  getDefaultCampanaId,
  idiomasChartData,
  portadasChartData,
  progresoData,
  tipoChartData,
  unidadesPorIdiomaChartData,
  type Campana,
  type Perfil,
  type Solicitud,
} from "@/features/dashboard/domain/dashboard-stats";

function sol(overrides: Partial<Solicitud> = {}): Solicitud {
  return {
    id: "s1",
    estado: "borrador",
    campana_id: "c1",
    comercial_id: null,
    idioma: "Español",
    canal: null,
    comercial_nombre: null,
    comercial_codigo: null,
    solicitud_catalogos: [],
    ...overrides,
  };
}

describe("fmtNum", () => {
  it("separa miles con punto, igual que el original", () => {
    expect(fmtNum(1234567)).toBe("1.234.567");
    expect(fmtNum(0)).toBe("0");
    expect(fmtNum(999)).toBe("999");
  });
});

describe("getDefaultCampanaId", () => {
  const campanas: Campana[] = [
    { id: "old", nombre: "Vieja", activa: true, fecha_cierre: "2025-01-01", catalogos: null },
    { id: "new", nombre: "Nueva", activa: true, fecha_cierre: "2026-01-01", catalogos: null },
    { id: "inactive", nombre: "Inactiva", activa: false, fecha_cierre: "2027-01-01", catalogos: null },
  ];

  it("elige la activa con fecha_cierre más reciente", () => {
    expect(getDefaultCampanaId(campanas)).toBe("new");
  });

  it("sin campañas activas, usa la primera de la lista", () => {
    expect(getDefaultCampanaId([{ id: "x", nombre: "X", activa: false, fecha_cierre: null, catalogos: null }])).toBe(
      "x"
    );
  });

  it("sin campañas, devuelve cadena vacía", () => {
    expect(getDefaultCampanaId([])).toBe("");
  });
});

describe("catsForDashboard", () => {
  it("sin campaña seleccionada (catalogos null) cae a los 4 catálogos", () => {
    expect(catsForDashboard(null).map((c) => c.key)).toEqual(ALL_CATS.map((c) => c.key));
  });

  it("respeta un array vacío tal cual (no cae al default)", () => {
    expect(catsForDashboard([])).toEqual([]);
  });

  it("filtra a los catálogos indicados por la campaña", () => {
    expect(catsForDashboard(["roly", "xmas"]).map((c) => c.key)).toEqual(["roly", "xmas"]);
  });
});

describe("filterByResponsableCanal", () => {
  const perfiles: Perfil[] = [
    { id: "com-nac", rol: "comercial_nacional" },
    { id: "com-exp", rol: "comercial_exportacion" },
    { id: "resp-nac", rol: "responsable_nacional" },
  ];

  it("responsable_nacional ve solicitudes de comerciales nacionales o con canal nacional", () => {
    const sols = [
      sol({ id: "a", comercial_id: "com-nac" }),
      sol({ id: "b", comercial_id: "com-exp" }),
      sol({ id: "c", comercial_id: null, canal: "nacional" }),
    ];
    expect(filterByResponsableCanal(sols, perfiles, "responsable_nacional").map((s) => s.id)).toEqual(["a", "c"]);
  });

  it("otros roles no se filtran", () => {
    const sols = [sol({ id: "a" }), sol({ id: "b" })];
    expect(filterByResponsableCanal(sols, perfiles, "admin")).toHaveLength(2);
  });
});

describe("computeKpis", () => {
  it("excluye archivadas del total y de los KPIs activos", () => {
    const sols = [
      sol({ estado: "borrador" }),
      sol({ estado: "confirmada" }),
      sol({ estado: "archivada" }),
      sol({ estado: "archivada" }),
    ];
    const kpis = computeKpis(sols, "Campaña X");
    expect(kpis.total).toBe(2);
    expect(kpis.estado.find((k) => k.label === "Archivadas")?.num).toBe(2);
    expect(kpis.campanaLabel).toBe("Campaña X · 2 solicitudes (+ 2 archivadas)");
  });

  it("sin archivadas no añade el sufijo", () => {
    const kpis = computeKpis([sol({ estado: "borrador" })], "Campaña Y");
    expect(kpis.campanaLabel).toBe("Campaña Y · 1 solicitudes");
  });

  it("precios: solo cuenta stamina/xmas de solicitudes en Español con catalogo_impreso no nulo", () => {
    const sols = [
      sol({
        idioma: "Español",
        solicitud_catalogos: [
          { catalogo: "stamina", unidades: 10, catalogo_digital: null, catalogo_impreso: true, portada_personalizada: null, con_precios: true },
          { catalogo: "xmas", unidades: 5, catalogo_digital: null, catalogo_impreso: null, portada_personalizada: null, con_precios: true },
        ],
      }),
      sol({
        idioma: "Inglés",
        solicitud_catalogos: [
          { catalogo: "stamina", unidades: 100, catalogo_digital: null, catalogo_impreso: true, portada_personalizada: null, con_precios: true },
        ],
      }),
    ];
    const kpis = computeKpis(sols, "X");
    expect(kpis.precios.find((k) => k.label === "Con precios (ES)")?.num).toBe("10");
  });
});

describe("tipoChartData vs portadasChartData: truthy vs !== null", () => {
  const cats = [{ key: "roly", label: "ROLY" }];

  it("tipoChartData solo cuenta catalogo_digital/impreso === true (no false)", () => {
    const sols = [
      sol({ solicitud_catalogos: [{ catalogo: "roly", unidades: 1, catalogo_digital: false, catalogo_impreso: true, portada_personalizada: null, con_precios: null }] }),
    ];
    const data = tipoChartData(sols, cats);
    expect(data.digital).toEqual([0]);
    expect(data.impreso).toEqual([1]);
  });

  it("portadasChartData cuenta como 'con catálogo' cualquier valor no nulo (true o false)", () => {
    const sols = [
      sol({ solicitud_catalogos: [{ catalogo: "roly", unidades: 1, catalogo_digital: false, catalogo_impreso: null, portada_personalizada: false, con_precios: null }] }),
    ];
    const data = portadasChartData(sols, cats);
    expect(data.conPortada).toEqual([0]);
    expect(data.sinPortada).toEqual([1]);
  });
});

describe("idiomasChartData / unidadesPorIdiomaChartData", () => {
  it("unidadesPorIdioma reutiliza el mismo top-10 de idiomas, no uno propio por unidades", () => {
    const sols = [
      sol({ idioma: "Español", solicitud_catalogos: [{ catalogo: "roly", unidades: 5, catalogo_digital: null, catalogo_impreso: null, portada_personalizada: null, con_precios: null }] }),
      sol({ idioma: "Francés", solicitud_catalogos: [{ catalogo: "roly", unidades: 500, catalogo_digital: null, catalogo_impreso: null, portada_personalizada: null, con_precios: null }] }),
    ];
    const idiomas = idiomasChartData(sols);
    const unidades = unidadesPorIdiomaChartData(sols, [{ key: "roly", label: "ROLY" }], idiomas.labels);
    expect(unidades.idiomaLabels).toEqual(idiomas.labels);
  });
});

describe("progresoData", () => {
  it("con total 0 no devuelve pasos (barra oculta)", () => {
    expect(progresoData([sol({ estado: "borrador" })], 0)).toEqual([]);
  });

  it("con total > 0 calcula porcentajes por paso", () => {
    const sols = [sol({ estado: "borrador" }), sol({ estado: "enviada" })];
    const steps = progresoData(sols, 2);
    expect(steps.find((s) => s.label === "Borrador")).toEqual({ label: "Borrador", color: "#E0DED6", count: 1, pct: 50 });
  });
});
