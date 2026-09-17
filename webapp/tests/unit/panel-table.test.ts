import { describe, expect, it } from "vitest";
import { comercialesFiltro, filterPanelRows, panelStats, portadasAdjudicacion, sortPanelRows } from "@/features/panel-global/domain/table";
import type { SolicitudCatalogoRow } from "@/features/solicitudes/domain/table";
import type { SolicitudListItem } from "@/features/solicitudes/domain/table";

function sol(overrides: Partial<SolicitudListItem> = {}): SolicitudListItem {
  return {
    id: "1",
    cod_sap: "60239",
    nombre_empresa: "ACME",
    provincia: "Madrid",
    idioma: "Español",
    comentarios: null,
    canal: null,
    comercial_id: "u1",
    campana_id: "c1",
    asignado_id: null,
    estado: "enviada",
    enviada_at: null,
    updated_at: "2026-01-01T00:00:00Z",
    solicitud_catalogos: [],
    adjuntos: [],
    ...overrides,
  };
}

const perfiles = [
  { id: "u1", nombre: "Ana García", rol: "comercial_nacional", activo: true },
  { id: "u2", nombre: "Bea López", rol: "comercial_exportacion", activo: true },
  { id: "u3", nombre: "Carlos Resp", rol: "responsable_nacional", activo: true },
];

describe("filterPanelRows", () => {
  const rows = [
    sol({ id: "a", cod_sap: "60239", nombre_empresa: "ACME", comercial_id: "u1", campana_id: "c1", estado: "enviada" }),
    sol({ id: "b", cod_sap: "70001", nombre_empresa: "OTRA", comercial_id: "u2", campana_id: "c2", estado: "confirmada" }),
    sol({ id: "c", cod_sap: "80002", nombre_empresa: "ARCHIVADA", comercial_id: "u1", campana_id: "c1", estado: "archivada" }),
  ];

  it("sin filtro de estado, oculta archivadas", () => {
    expect(filterPanelRows(rows, { q: "", estado: "", comercialId: "", provincia: "", campanaId: "" }, "admin", perfiles).map((r) => r.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("con filtro de estado explícito, muestra archivadas", () => {
    expect(
      filterPanelRows(rows, { q: "", estado: "archivada", comercialId: "", provincia: "", campanaId: "" }, "admin", perfiles).map((r) => r.id)
    ).toEqual(["c"]);
  });

  it("busca por SAP, empresa o nombre del comercial", () => {
    expect(filterPanelRows(rows, { q: "ana", estado: "", comercialId: "", provincia: "", campanaId: "" }, "admin", perfiles).map((r) => r.id)).toEqual([
      "a",
    ]);
    expect(filterPanelRows(rows, { q: "70001", estado: "", comercialId: "", provincia: "", campanaId: "" }, "admin", perfiles).map((r) => r.id)).toEqual([
      "b",
    ]);
  });

  it("filtra por campaña", () => {
    expect(filterPanelRows(rows, { q: "", estado: "", comercialId: "", provincia: "", campanaId: "c2" }, "admin", perfiles).map((r) => r.id)).toEqual([
      "b",
    ]);
  });

  it("filtra por comercial", () => {
    expect(
      filterPanelRows(rows, { q: "", estado: "", comercialId: "u2", provincia: "", campanaId: "" }, "admin", perfiles).map((r) => r.id)
    ).toEqual(["b"]);
  });

  it("responsable_nacional/exportacion: restringido a su propio colectivo de comerciales (PAN-01)", () => {
    const conResponsable = [
      sol({ id: "a", comercial_id: "u1" }), // comercial_nacional
      sol({ id: "b", comercial_id: "u2" }), // comercial_exportacion
    ];
    expect(
      filterPanelRows(conResponsable, { q: "", estado: "", comercialId: "", provincia: "", campanaId: "" }, "responsable_nacional", perfiles).map(
        (r) => r.id
      )
    ).toEqual(["a"]);
    expect(
      filterPanelRows(conResponsable, { q: "", estado: "", comercialId: "", provincia: "", campanaId: "" }, "responsable_exportacion", perfiles).map(
        (r) => r.id
      )
    ).toEqual(["b"]);
  });
});

describe("sortPanelRows", () => {
  it("ordena por comercial usando el nombre del perfil relacionado, no el id", () => {
    const rows = [sol({ id: "a", comercial_id: "u2" }), sol({ id: "b", comercial_id: "u1" })];
    const asc = sortPanelRows(rows, { col: "comercial", dir: "asc" }, perfiles);
    expect(asc.map((r) => r.id)).toEqual(["b", "a"]); // Ana García < Bea López
  });

  it("ordena por una columna simple (cod_sap)", () => {
    const rows = [sol({ id: "a", cod_sap: "80000" }), sol({ id: "b", cod_sap: "10000" })];
    expect(sortPanelRows(rows, { col: "cod_sap", dir: "asc" }, perfiles).map((r) => r.id)).toEqual(["b", "a"]);
    expect(sortPanelRows(rows, { col: "cod_sap", dir: "desc" }, perfiles).map((r) => r.id)).toEqual(["a", "b"]);
  });
});

describe("comercialesFiltro", () => {
  it("solo comerciales/responsables activos, ordenados por nombre", () => {
    const conInactivo = [...perfiles, { id: "u4", nombre: "Diego Inactivo", rol: "comercial_nacional", activo: false }];
    expect(comercialesFiltro(conInactivo).map((p) => p.nombre)).toEqual(["Ana García", "Bea López", "Carlos Resp"]);
  });
});

describe("portadasAdjudicacion", () => {
  function cat(overrides: Partial<SolicitudCatalogoRow> = {}): SolicitudCatalogoRow {
    return {
      catalogo: "roly",
      catalogo_digital: null,
      catalogo_impreso: true,
      unidades: 200,
      portada_personalizada: true,
      portada_diseno_propio: false,
      portada_opcion_1: "P01",
      portada_opcion_2: null,
      portada_opcion_3: null,
      portada_elegida: null,
      posicion_logo: null,
      con_precios: null,
      ...overrides,
    };
  }

  it("sin catálogos devuelve todo a cero", () => {
    expect(portadasAdjudicacion([])).toEqual({ necesitan: 0, asignadas: 0, pendientes: [] });
  });

  it("diseño propio no cuenta como pendiente", () => {
    expect(portadasAdjudicacion([cat({ portada_diseno_propio: true })])).toEqual({ necesitan: 0, asignadas: 0, pendientes: [] });
  });

  it("portada_personalizada=false no cuenta", () => {
    expect(portadasAdjudicacion([cat({ portada_personalizada: false })])).toEqual({ necesitan: 0, asignadas: 0, pendientes: [] });
  });

  it("portada_elegida null → pendiente", () => {
    const r = portadasAdjudicacion([cat({ catalogo: "roly", portada_elegida: null })]);
    expect(r).toEqual({ necesitan: 1, asignadas: 0, pendientes: ["roly"] });
  });

  it("portada_elegida asignada → completa", () => {
    const r = portadasAdjudicacion([cat({ catalogo: "roly", portada_elegida: "P01" })]);
    expect(r).toEqual({ necesitan: 1, asignadas: 1, pendientes: [] });
  });

  it("mezcla: roly asignado, stamina pendiente → 1/2, falta stamina", () => {
    const r = portadasAdjudicacion([
      cat({ catalogo: "roly", portada_elegida: "P01" }),
      cat({ catalogo: "stamina", portada_elegida: null }),
    ]);
    expect(r).toEqual({ necesitan: 2, asignadas: 1, pendientes: ["stamina"] });
  });

  it("filtro soloSinPortada solo incluye en_revision_marketing con pendientes", () => {
    const rows = [
      sol({ id: "a", estado: "en_revision_marketing", solicitud_catalogos: [cat({ portada_elegida: null })] }),
      sol({ id: "b", estado: "en_revision_marketing", solicitud_catalogos: [cat({ portada_elegida: "P01" })] }),
      sol({ id: "c", estado: "enviada", solicitud_catalogos: [cat({ portada_elegida: null })] }),
    ];
    const result = filterPanelRows(rows, { q: "", estado: "", comercialId: "", provincia: "", campanaId: "", soloSinPortada: true }, "admin", perfiles);
    expect(result.map((r) => r.id)).toEqual(["a"]);
  });
});

describe("panelStats", () => {
  const catalogosPorId = new Map<string, string[] | null>([["c1", ["roly"]]]);

  it("cuenta por estado, filtrando solo por campaña (no por el resto de filtros de la tabla)", () => {
    const rows = [
      sol({ id: "a", campana_id: "c1", estado: "borrador" }),
      sol({ id: "b", campana_id: "c1", estado: "enviada" }),
      sol({ id: "c", campana_id: "c2", estado: "confirmada" }),
      sol({ id: "d", campana_id: "c1", estado: "archivada" }),
    ];
    const stats = panelStats(rows, "c1", catalogosPorId);
    expect(stats.map((s) => s.value)).toEqual([2, 1, 1, 0, 0, 0, 0, 0]);
  });

  it("sin campaña seleccionada, cuenta sobre todas las filas", () => {
    const rows = [sol({ id: "a", campana_id: "c1", estado: "confirmada" }), sol({ id: "b", campana_id: "c2", estado: "confirmada" })];
    const stats = panelStats(rows, "", catalogosPorId);
    expect(stats.find((s) => s.label === "Confirmadas")?.value).toBe(2);
  });

  it("Incompletas cuenta las que fallan missingFields, usando los catálogos de la campaña de cada solicitud", () => {
    const rows = [
      sol({ id: "a", campana_id: "c1", provincia: "Madrid", estado: "confirmada" }),
      sol({ id: "b", campana_id: "c1", provincia: null, estado: "confirmada" }),
    ];
    const stats = panelStats(rows, "c1", catalogosPorId);
    expect(stats.find((s) => s.label === "Total")?.value).toBe(2);
    expect(stats.find((s) => s.label === "Incompletas")?.value).toBe(1);
  });

  it("En diseño suma en_diseno + modificar_diseno", () => {
    const rows = [sol({ id: "a", campana_id: "c1", estado: "en_diseno" }), sol({ id: "b", campana_id: "c1", estado: "modificar_diseno" })];
    const stats = panelStats(rows, "c1", catalogosPorId);
    expect(stats.find((s) => s.label === "En diseño")?.value).toBe(2);
  });
});
