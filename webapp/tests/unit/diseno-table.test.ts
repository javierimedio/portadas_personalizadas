import { describe, expect, it } from "vitest";
import {
  disenadorStats,
  disenadoresActivos,
  filterDisenoTareas,
  sortDisenoTareas,
  UNASSIGNED_DISENADOR,
  parseUrlState,
  buildUrlState,
  ROLES_FILTRO_DISENADOR_VISIBLE,
} from "@/features/diseno/domain/table";
import type { DisenoFilters, SortConfig } from "@/features/diseno/domain/table";
import type { SolicitudListItem, SolicitudCatalogoRow } from "@/features/solicitudes/domain/table";

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
    estado: "en_diseno",
    enviada_at: null,
    updated_at: "2026-01-01T00:00:00Z",
    solicitud_catalogos: [],
    adjuntos: [],
    ...overrides,
  };
}

describe("filterDisenoTareas", () => {
  const rows = [
    sol({ id: "a", estado: "en_diseno", campana_id: "c1", asignado_id: "d1" }),
    sol({ id: "b", estado: "modificar_diseno", campana_id: "c2", asignado_id: "d2" }),
    sol({ id: "c", estado: "borrador", campana_id: "c1" }),
    sol({ id: "d", estado: "confirmada", campana_id: "c1" }),
    sol({ id: "e", estado: "diseno_en_revision_comercial", campana_id: "c1", asignado_id: "d1" }),
  ];

  it("solo estados de Diseño (en_diseno/modificar_diseno/diseno_en_revision_comercial)", () => {
    expect(filterDisenoTareas(rows, { campanaId: "", disenadorId: "", q: "" }).map((r) => r.id)).toEqual(["a", "b", "e"]);
  });

  it("filtra por campaña", () => {
    expect(filterDisenoTareas(rows, { campanaId: "c2", disenadorId: "", q: "" }).map((r) => r.id)).toEqual(["b"]);
  });

  it("filtra por diseñador asignado", () => {
    expect(filterDisenoTareas(rows, { campanaId: "", disenadorId: "d1", q: "" }).map((r) => r.id)).toEqual(["a", "e"]);
  });

  it("filtra por código SAP parcial", () => {
    const withSap = [
      sol({ id: "x", estado: "en_diseno", cod_sap: "60239" }),
      sol({ id: "y", estado: "en_diseno", cod_sap: "70100" }),
    ];
    expect(filterDisenoTareas(withSap, { campanaId: "", disenadorId: "", q: "602" }).map((r) => r.id)).toEqual(["x"]);
  });

  it("la búsqueda SAP es insensible a mayúsculas", () => {
    const withSap = [sol({ id: "x", estado: "en_diseno", cod_sap: "60239" })];
    expect(filterDisenoTareas(withSap, { campanaId: "", disenadorId: "", q: "60239" }).map((r) => r.id)).toEqual(["x"]);
  });

  it("filtra solicitudes sin diseñador asignado con UNASSIGNED_DISENADOR", () => {
    const mixed = [
      sol({ id: "a", estado: "en_diseno", asignado_id: "d1" }),
      sol({ id: "b", estado: "en_diseno", asignado_id: null }),
      sol({ id: "c", estado: "modificar_diseno", asignado_id: null }),
    ];
    expect(
      filterDisenoTareas(mixed, { campanaId: "", disenadorId: UNASSIGNED_DISENADOR, q: "" }).map((r) => r.id)
    ).toEqual(["b", "c"]);
  });
});

describe("disenadoresActivos", () => {
  it("solo disenador/responsable_diseno activos, ordenados por nombre", () => {
    const perfiles = [
      { id: "1", nombre: "Zoe", rol: "disenador", activo: true },
      { id: "2", nombre: "Ana", rol: "responsable_diseno", activo: true },
      { id: "3", nombre: "Bea", rol: "disenador", activo: false },
      { id: "4", nombre: "Cris", rol: "marketing", activo: true },
    ];
    expect(disenadoresActivos(perfiles).map((p) => p.nombre)).toEqual(["Ana", "Zoe"]);
  });
});

// ---------------------------------------------------------------------------
// P0-E: helpers
// ---------------------------------------------------------------------------
function rolyEntry(overrides: Partial<SolicitudCatalogoRow> = {}): SolicitudCatalogoRow {
  return {
    catalogo: "roly",
    catalogo_digital: true,
    catalogo_impreso: true,
    unidades: 100,
    portada_personalizada: true,
    portada_diseno_propio: false,
    portada_opcion_1: "Opción A",
    portada_opcion_2: null,
    portada_opcion_3: null,
    portada_elegida: null,
    posicion_logo: null,
    con_precios: null,
    ...overrides,
  };
}

const perfilesPO: { id: string; nombre: string; rol: string; activo: boolean }[] = [
  { id: "d1", nombre: "Ana García", rol: "disenador", activo: true },
  { id: "d2", nombre: "Bea López", rol: "disenador", activo: true },
];

// ---------------------------------------------------------------------------
// P0-E: filter + sorting tests
// ---------------------------------------------------------------------------
describe("P0-E — filterDisenoTareas: filtros", () => {
  // 1. Filtrar por SAP
  it("1. filtra por SAP (búsqueda exacta parcial)", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno", cod_sap: "60001" }),
      sol({ id: "b", estado: "en_diseno", cod_sap: "70002" }),
    ];
    expect(filterDisenoTareas(rows, { campanaId: "", disenadorId: "", q: "600" }).map((r) => r.id)).toEqual(["a"]);
  });

  // 4. Filtrar por diseñador
  it("4. filtra por diseñador asignado", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno", asignado_id: "d1" }),
      sol({ id: "b", estado: "en_diseno", asignado_id: "d2" }),
    ];
    expect(
      filterDisenoTareas(rows, { campanaId: "", disenadorId: "d1", q: "" }).map((r) => r.id)
    ).toEqual(["a"]);
  });

  // 5. Filtrar por estado (cualquiera de los 3 válidos)
  it("5. filtra por estado exacto (modificar_diseno)", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno" }),
      sol({ id: "b", estado: "modificar_diseno" }),
      sol({ id: "c", estado: "diseno_en_revision_comercial" }),
    ];
    expect(
      filterDisenoTareas(rows, { campanaId: "", disenadorId: "", q: "", estado: "modificar_diseno" }).map((r) => r.id)
    ).toEqual(["b"]);
  });

  // 14. Combinación diseñador + estado
  it("14. filtros funcionan con estado + diseñador combinados", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno", asignado_id: "d1" }),
      sol({ id: "b", estado: "modificar_diseno", asignado_id: "d1" }),
      sol({ id: "c", estado: "en_diseno", asignado_id: "d2" }),
    ];
    expect(
      filterDisenoTareas(rows, { campanaId: "", disenadorId: "d1", q: "", estado: "en_diseno" }).map((r) => r.id)
    ).toEqual(["a"]);
  });

  // 16. Estado inválido (confirmada) no filtra resultados
  it("16. estado inválido (confirmada) no filtra resultados", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno" }),
      sol({ id: "b", estado: "modificar_diseno" }),
    ];
    expect(
      filterDisenoTareas(rows, { campanaId: "", disenadorId: "", q: "", estado: "confirmada" }).map((r) => r.id)
    ).toEqual(["a", "b"]);
  });

  // 17. Sin filtros devuelve todos sin truncar
  it("17. sin filtros devuelve todos los en_diseno/modificar_diseno/diseno_en_revision_comercial sin truncar", () => {
    const rows = Array.from({ length: 60 }, (_, i) =>
      sol({
        id: String(i),
        estado: i % 3 === 0 ? "en_diseno" : i % 3 === 1 ? "modificar_diseno" : "diseno_en_revision_comercial",
      })
    );
    expect(filterDisenoTareas(rows, { campanaId: "", disenadorId: "", q: "" })).toHaveLength(60);
  });

  // 18. SAP + estado combinados
  it("18. búsqueda q + filtro estado se aplican simultáneamente", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno", cod_sap: "60001" }),
      sol({ id: "b", estado: "modificar_diseno", cod_sap: "60001" }),
      sol({ id: "c", estado: "en_diseno", cod_sap: "70002" }),
    ];
    expect(
      filterDisenoTareas(rows, { campanaId: "", disenadorId: "", q: "60001", estado: "en_diseno" }).map((r) => r.id)
    ).toEqual(["a"]);
  });

  // 19. Sin filtros → mismo comportamiento
  it("19. sin filtros devuelve lo mismo que el comportamiento original", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno" }),
      sol({ id: "b", estado: "modificar_diseno" }),
      sol({ id: "c", estado: "borrador" }),
      sol({ id: "d", estado: "confirmada" }),
    ];
    expect(
      filterDisenoTareas(rows, { campanaId: "", disenadorId: "", q: "" }).map((r) => r.id)
    ).toEqual(["a", "b"]);
  });
});

describe("P0-E — sortDisenoTareas", () => {
  const noPerfiles: { id: string; nombre: string; rol: string; activo: boolean }[] = [];

  it("7. ordena por cod_sap ascendente", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno", cod_sap: "70002" }),
      sol({ id: "b", estado: "en_diseno", cod_sap: "60001" }),
    ];
    expect(sortDisenoTareas(rows, { field: "cod_sap", dir: "asc" }, noPerfiles).map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("7b. ordena por cod_sap descendente", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno", cod_sap: "60001" }),
      sol({ id: "b", estado: "en_diseno", cod_sap: "70002" }),
    ];
    expect(sortDisenoTareas(rows, { field: "cod_sap", dir: "desc" }, noPerfiles).map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("8. ordena por nombre_empresa ascendente", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno", nombre_empresa: "Zeta" }),
      sol({ id: "b", estado: "en_diseno", nombre_empresa: "Alpha" }),
    ];
    expect(sortDisenoTareas(rows, { field: "nombre_empresa", dir: "asc" }, noPerfiles).map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("9. ordena por provincia ascendente", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno", provincia: "Valencia" }),
      sol({ id: "b", estado: "en_diseno", provincia: "Madrid" }),
      sol({ id: "c", estado: "en_diseno", provincia: "Barcelona" }),
    ];
    expect(sortDisenoTareas(rows, { field: "provincia", dir: "asc" }, noPerfiles).map((r) => r.id)).toEqual(["c", "b", "a"]);
  });

  it("10. ordena por ROLY: sin ROLY primero en asc (empty < no < summary)", () => {
    const rows = [
      sol({ id: "si", estado: "en_diseno", solicitud_catalogos: [rolyEntry()] }),
      sol({ id: "sin", estado: "en_diseno", solicitud_catalogos: [] }),
      sol({ id: "no", estado: "en_diseno", solicitud_catalogos: [rolyEntry({ catalogo_impreso: false, catalogo_digital: false })] }),
    ];
    expect(sortDisenoTareas(rows, { field: "roly", dir: "asc" }, noPerfiles).map((r) => r.id)).toEqual(["sin", "no", "si"]);
  });

  it("10b. ordena por ROLY descendente (summary primero)", () => {
    const rows = [
      sol({ id: "sin", estado: "en_diseno", solicitud_catalogos: [] }),
      sol({ id: "si", estado: "en_diseno", solicitud_catalogos: [rolyEntry()] }),
    ];
    expect(sortDisenoTareas(rows, { field: "roly", dir: "desc" }, noPerfiles).map((r) => r.id)).toEqual(["si", "sin"]);
  });

  it("11. ordena por fecha ascendente (más antigua primero)", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno", enviada_at: "2026-09-10T00:00:00Z" }),
      sol({ id: "b", estado: "en_diseno", enviada_at: "2026-08-01T00:00:00Z" }),
    ];
    expect(sortDisenoTareas(rows, { field: "fecha", dir: "asc" }, noPerfiles).map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("11b. ordena por fecha descendente (más reciente primero)", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno", enviada_at: "2026-08-01T00:00:00Z" }),
      sol({ id: "b", estado: "en_diseno", enviada_at: "2026-09-10T00:00:00Z" }),
    ];
    expect(sortDisenoTareas(rows, { field: "fecha", dir: "desc" }, noPerfiles).map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("12. ordena por nombre de diseñador ascendente", () => {
    const perfiles = [
      { id: "d1", nombre: "Zoe", rol: "disenador", activo: true },
      { id: "d2", nombre: "Ana", rol: "disenador", activo: true },
    ];
    const rows = [
      sol({ id: "a", estado: "en_diseno", asignado_id: "d1" }),
      sol({ id: "b", estado: "en_diseno", asignado_id: "d2" }),
    ];
    expect(sortDisenoTareas(rows, { field: "disenador", dir: "asc" }, perfiles).map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("13. ordena por estado ascendente (en_diseno < modificar_diseno)", () => {
    const rows = [
      sol({ id: "a", estado: "modificar_diseno" }),
      sol({ id: "b", estado: "en_diseno" }),
    ];
    expect(sortDisenoTareas(rows, { field: "estado", dir: "asc" }, noPerfiles).map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("sort null devuelve el array en el mismo orden (sin copia mutada)", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno" }),
      sol({ id: "b", estado: "en_diseno" }),
    ];
    const result = sortDisenoTareas(rows, null, noPerfiles);
    expect(result.map((r) => r.id)).toEqual(["a", "b"]);
  });
});

describe("disenadorStats", () => {
  const perfiles = [
    { id: "d1", nombre: "Ana García", rol: "disenador", activo: true },
    { id: "d2", nombre: "Bea López", rol: "disenador", activo: true },
  ];

  it("cuenta los 4 estados por diseñador", () => {
    const rows = [
      sol({ id: "a1", asignado_id: "d1", estado: "modificar_diseno" }),
      sol({ id: "a2", asignado_id: "d1", estado: "en_diseno" }),
      sol({ id: "a3", asignado_id: "d1", estado: "diseno_en_revision_comercial" }),
      sol({ id: "a4", asignado_id: "d1", estado: "confirmada" }),
      sol({ id: "b1", asignado_id: "d2", estado: "en_diseno" }),
    ];
    const stats = disenadorStats(rows, perfiles, "");
    expect(stats).toEqual([
      { id: "d1", nombre: "Ana García", pendientes: 1, enDiseno: 1, mandadas: 1, aprobadas: 1 },
      { id: "d2", nombre: "Bea López", pendientes: 0, enDiseno: 1, mandadas: 0, aprobadas: 0 },
    ]);
  });

  it("omite diseñadores sin ninguna solicitud asignada en las 4 fases", () => {
    const rows = [sol({ id: "a1", asignado_id: "d1", estado: "en_diseno" })];
    const stats = disenadorStats(rows, perfiles, "");
    expect(stats.map((s) => s.id)).toEqual(["d1"]);
  });

  it("filtra por campaña", () => {
    const rows = [
      sol({ id: "a1", asignado_id: "d1", estado: "en_diseno", campana_id: "c1" }),
      sol({ id: "a2", asignado_id: "d1", estado: "en_diseno", campana_id: "c2" }),
    ];
    const stats = disenadorStats(rows, perfiles, "c1");
    expect(stats).toEqual([
      { id: "d1", nombre: "Ana García", pendientes: 0, enDiseno: 1, mandadas: 0, aprobadas: 0 },
    ]);
  });

  it("filtra por diseñador individual", () => {
    const rows = [
      sol({ id: "a1", asignado_id: "d1", estado: "modificar_diseno" }),
      sol({ id: "b1", asignado_id: "d2", estado: "confirmada" }),
    ];
    const stats = disenadorStats(rows, perfiles, "", "d2");
    expect(stats).toEqual([
      { id: "d2", nombre: "Bea López", pendientes: 0, enDiseno: 0, mandadas: 0, aprobadas: 1 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Filtros simplificados — los 3 estados de diseño (22 nuevos escenarios)
// ---------------------------------------------------------------------------
describe("Filtros simplificados — los 3 estados de diseño", () => {
  const allThreeRows = [
    sol({ id: "a", estado: "en_diseno" }),
    sol({ id: "b", estado: "modificar_diseno" }),
    sol({ id: "c", estado: "diseno_en_revision_comercial" }),
    sol({ id: "d", estado: "confirmada" }),
    sol({ id: "e", estado: "borrador" }),
  ];

  // 1. Sin filtros → los 3 estados aparecen
  it("1. sin filtros → aparecen los 3 estados de diseño", () => {
    const result = filterDisenoTareas(allThreeRows, { campanaId: "", disenadorId: "", q: "" });
    expect(result.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  // 2-4. Cada uno de los 3 estados aparece sin filtro
  it("2. sin filtros → incluye en_diseno", () => {
    const result = filterDisenoTareas(allThreeRows, { campanaId: "", disenadorId: "", q: "" });
    expect(result.some((r) => r.estado === "en_diseno")).toBe(true);
  });

  it("3. sin filtros → incluye modificar_diseno", () => {
    const result = filterDisenoTareas(allThreeRows, { campanaId: "", disenadorId: "", q: "" });
    expect(result.some((r) => r.estado === "modificar_diseno")).toBe(true);
  });

  it("4. sin filtros → incluye diseno_en_revision_comercial", () => {
    const result = filterDisenoTareas(allThreeRows, { campanaId: "", disenadorId: "", q: "" });
    expect(result.some((r) => r.estado === "diseno_en_revision_comercial")).toBe(true);
  });

  // 5-7. Filtrar por cada uno de los 3 estados
  it("5. filtrar por en_diseno muestra solo en_diseno", () => {
    const result = filterDisenoTareas(allThreeRows, { campanaId: "", disenadorId: "", q: "", estado: "en_diseno" });
    expect(result.map((r) => r.id)).toEqual(["a"]);
  });

  it("6. filtrar por modificar_diseno muestra solo modificar_diseno", () => {
    const result = filterDisenoTareas(allThreeRows, { campanaId: "", disenadorId: "", q: "", estado: "modificar_diseno" });
    expect(result.map((r) => r.id)).toEqual(["b"]);
  });

  it("7. filtrar por diseno_en_revision_comercial muestra solo ese estado", () => {
    const result = filterDisenoTareas(allThreeRows, { campanaId: "", disenadorId: "", q: "", estado: "diseno_en_revision_comercial" });
    expect(result.map((r) => r.id)).toEqual(["c"]);
  });

  // 10-11. SAP no busca por empresa ni provincia
  it("10. búsqueda SAP no filtra por nombre_empresa", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno", cod_sap: "60001", nombre_empresa: "ACME" }),
      sol({ id: "b", estado: "en_diseno", cod_sap: "70002", nombre_empresa: "ACME" }),
    ];
    // "ACME" does not match any cod_sap → ningún resultado
    const result = filterDisenoTareas(rows, { campanaId: "", disenadorId: "", q: "ACME" });
    expect(result).toHaveLength(0);
  });

  it("11. búsqueda SAP no filtra por provincia", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno", cod_sap: "60001", provincia: "Murcia" }),
      sol({ id: "b", estado: "en_diseno", cod_sap: "70002", provincia: "Murcia" }),
    ];
    // "Murcia" does not match any cod_sap → ningún resultado
    const result = filterDisenoTareas(rows, { campanaId: "", disenadorId: "", q: "Murcia" });
    expect(result).toHaveLength(0);
  });

  // 12-13. DisenoFilters no tiene campo 'provincia' ni 'vista' (type-level, verified at runtime)
  it("12. DisenoFilters no acepta campo provincia", () => {
    const filters: DisenoFilters = { campanaId: "", disenadorId: "", q: "" };
    expect(Object.keys(filters)).not.toContain("provincia");
  });

  it("13. DisenoFilters no acepta campo vista", () => {
    const filters: DisenoFilters = { campanaId: "", disenadorId: "", q: "" };
    expect(Object.keys(filters)).not.toContain("vista");
  });

  // 14-16. URL state no contiene campanaId, vista, ni provincia
  it("14. campanaId no está en URL (parseUrlState no lo devuelve)", () => {
    const s = parseUrlState(new URLSearchParams("campana=c1"));
    expect(Object.keys(s)).not.toContain("campanaId");
  });

  it("15. parseUrlState ya no utiliza vista", () => {
    const s = parseUrlState(new URLSearchParams("vista=enviadas_comercial"));
    expect(Object.keys(s)).not.toContain("vista");
  });

  it("16. parseUrlState ya no utiliza provincia", () => {
    const s = parseUrlState(new URLSearchParams("provincia=Murcia"));
    expect(Object.keys(s)).not.toContain("provincia");
  });

  // 17. buildUrlState no genera vista ni provincia
  it("17. buildUrlState no genera parámetros vista ni provincia", () => {
    const p = buildUrlState({ q: "test", disenadorId: "d1", estado: "en_diseno", sort: { field: "fecha", dir: "asc" }, page: 1 });
    expect(p.has("vista")).toBe(false);
    expect(p.has("provincia")).toBe(false);
  });

  // 18. Combinación estado + diseñador + SAP
  it("18. estado + diseñador + SAP combinados", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno", asignado_id: "d1", cod_sap: "60001" }),
      sol({ id: "b", estado: "modificar_diseno", asignado_id: "d1", cod_sap: "60001" }),
      sol({ id: "c", estado: "en_diseno", asignado_id: "d2", cod_sap: "60001" }),
      sol({ id: "d", estado: "en_diseno", asignado_id: "d1", cod_sap: "70002" }),
    ];
    const result = filterDisenoTareas(rows, { campanaId: "", disenadorId: "d1", q: "600", estado: "en_diseno" });
    expect(result.map((r) => r.id)).toEqual(["a"]);
  });

  // 21. Cambiar filtro → página 1 (buildUrlState con page: 1 no incluye el parámetro)
  it("21. buildUrlState con page=1 omite el parámetro de página (URL limpia)", () => {
    const p = buildUrlState({ q: "abc", disenadorId: "", estado: "", sort: { field: "fecha", dir: "asc" }, page: 1 });
    expect(p.has("page")).toBe(false);
  });

  // 22. ROLES_FILTRO_DISENADOR_VISIBLE mantiene los 4 roles correctos
  it("22. ROLES_FILTRO_DISENADOR_VISIBLE incluye los 4 roles con acceso al filtro", () => {
    expect(ROLES_FILTRO_DISENADOR_VISIBLE).toContain("admin");
    expect(ROLES_FILTRO_DISENADOR_VISIBLE).toContain("marketing");
    expect(ROLES_FILTRO_DISENADOR_VISIBLE).toContain("responsable_diseno");
    expect(ROLES_FILTRO_DISENADOR_VISIBLE).toContain("disenador");
  });
});

// ---------------------------------------------------------------------------
// parseUrlState
// ---------------------------------------------------------------------------
describe("parseUrlState", () => {
  function p(search: string): URLSearchParams {
    return new URLSearchParams(search);
  }

  it("params vacíos → valores por defecto", () => {
    const s = parseUrlState(p(""));
    expect(s.q).toBe("");
    expect(s.disenadorId).toBe("");
    expect(s.estado).toBe("");
    expect(s.sort).toEqual({ field: "fecha", dir: "asc" });
    expect(s.page).toBe(1);
  });

  it("lee q, disenador y estado", () => {
    const s = parseUrlState(p("q=abc&disenador=d1&estado=en_diseno"));
    expect(s.q).toBe("abc");
    expect(s.disenadorId).toBe("d1");
    expect(s.estado).toBe("en_diseno");
  });

  it("sort=cod_sap → campo correcto", () => {
    expect(parseUrlState(p("sort=cod_sap")).sort.field).toBe("cod_sap");
  });

  it("sort inválido → fecha por defecto", () => {
    expect(parseUrlState(p("sort=inventado")).sort.field).toBe("fecha");
  });

  it("dir=desc", () => {
    expect(parseUrlState(p("dir=desc")).sort.dir).toBe("desc");
  });

  it("dir inválido → asc por defecto", () => {
    expect(parseUrlState(p("dir=otro")).sort.dir).toBe("asc");
  });

  it("page=3", () => {
    expect(parseUrlState(p("page=3")).page).toBe(3);
  });

  it("page NaN → 1", () => {
    expect(parseUrlState(p("page=abc")).page).toBe(1);
  });

  it("page=0 → 1 (mínimo 1)", () => {
    expect(parseUrlState(p("page=0")).page).toBe(1);
  });

  it("todos los campos no-defecto a la vez", () => {
    const s = parseUrlState(p("q=SAP&disenador=d9&estado=modificar_diseno&sort=nombre_empresa&dir=desc&page=5"));
    expect(s).toEqual({
      q: "SAP",
      disenadorId: "d9",
      estado: "modificar_diseno",
      sort: { field: "nombre_empresa", dir: "desc" },
      page: 5,
    });
  });
});

// ---------------------------------------------------------------------------
// buildUrlState
// ---------------------------------------------------------------------------
describe("buildUrlState", () => {
  const defaults = {
    q: "",
    disenadorId: "",
    estado: "",
    sort: { field: "fecha" as const, dir: "asc" as const },
    page: 1,
  };

  it("estado por defecto → params vacíos (URL limpia)", () => {
    expect(buildUrlState(defaults).toString()).toBe("");
  });

  it("q no vacío → incluido", () => {
    expect(buildUrlState({ ...defaults, q: "ACME" }).get("q")).toBe("ACME");
  });

  it("sort no-defecto → incluido; dir asc no se incluye", () => {
    const p = buildUrlState({ ...defaults, sort: { field: "cod_sap", dir: "asc" } });
    expect(p.get("sort")).toBe("cod_sap");
    expect(p.has("dir")).toBe(false);
  });

  it("dir=desc → incluido", () => {
    const p = buildUrlState({ ...defaults, sort: { field: "fecha", dir: "desc" } });
    expect(p.has("sort")).toBe(false);
    expect(p.get("dir")).toBe("desc");
  });

  it("page > 1 → incluido", () => {
    expect(buildUrlState({ ...defaults, page: 3 }).get("page")).toBe("3");
  });

  it("page = 1 → omitido", () => {
    expect(buildUrlState(defaults).has("page")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// round-trip: buildUrlState → parseUrlState conserva el estado
// ---------------------------------------------------------------------------
describe("round-trip parseUrlState ↔ buildUrlState", () => {
  it("estado con todos los campos no-defecto sobrevive el round-trip", () => {
    const original = {
      q: "ACME",
      disenadorId: "d5",
      estado: "diseno_en_revision_comercial",
      sort: { field: "nombre_empresa" as const, dir: "desc" as const },
      page: 4,
    };
    const recovered = parseUrlState(buildUrlState(original));
    expect(recovered).toEqual(original);
  });
});

// ---------------------------------------------------------------------------
// P12 — preservación de filtros al cerrar detalle (URL state)
// ---------------------------------------------------------------------------
describe("P12 — preservación de filtros al cerrar detalle", () => {
  it("eliminar ?ver= deja el resto de params intactos", () => {
    const params = new URLSearchParams(
      "q=60001&disenador=d1&estado=en_diseno&sort=cod_sap&dir=desc&page=3&ver=some-uuid"
    );
    params.delete("ver");
    const state = parseUrlState(params);
    expect(state.q).toBe("60001");
    expect(state.disenadorId).toBe("d1");
    expect(state.estado).toBe("en_diseno");
    expect(state.sort).toEqual({ field: "cod_sap", dir: "desc" });
    expect(state.page).toBe(3);
  });

  it("eliminar ?ver= de URL con solo ese param produce URL limpia", () => {
    const params = new URLSearchParams("ver=some-uuid");
    params.delete("ver");
    expect(params.toString()).toBe("");
  });

  it("fila que cambia de estado desaparece de la cola tras router.refresh()", () => {
    // Simula: servidor devuelve filas actualizadas donde una ya no está en diseño
    const antesRows = [
      sol({ id: "a", estado: "en_diseno" }),
      sol({ id: "b", estado: "en_diseno" }),
    ];
    const despuesRows = [sol({ id: "b", estado: "en_diseno" })]; // "a" confirmada, no llega
    const filters: DisenoFilters = { campanaId: "", disenadorId: "", q: "" };
    expect(filterDisenoTareas(antesRows, filters).map((r) => r.id)).toEqual(["a", "b"]);
    expect(filterDisenoTareas(despuesRows, filters).map((r) => r.id)).toEqual(["b"]);
  });

  it("fila filtrada por SAP que cambia de estado también desaparece", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno", cod_sap: "60239" }),
      sol({ id: "b", estado: "modificar_diseno", cod_sap: "70100" }),
    ];
    const filters: DisenoFilters = { campanaId: "", disenadorId: "", q: "60239" };
    expect(filterDisenoTareas(rows, filters).map((r) => r.id)).toEqual(["a"]);
    // Tras refresh, "a" ya no está en diseño — servidor la excluye y row desaparece
    const rowsActualizadas = [sol({ id: "b", estado: "modificar_diseno", cod_sap: "70100" })];
    expect(filterDisenoTareas(rowsActualizadas, filters).map((r) => r.id)).toEqual([]);
  });

  it("sort y page sobreviven al eliminar ?ver= (params independientes)", () => {
    const params = new URLSearchParams("sort=disenador&dir=desc&page=5&ver=abc");
    params.delete("ver");
    const state = parseUrlState(params);
    expect(state.sort).toEqual({ field: "disenador", dir: "desc" });
    expect(state.page).toBe(5);
    expect(params.has("ver")).toBe(false);
  });
});
