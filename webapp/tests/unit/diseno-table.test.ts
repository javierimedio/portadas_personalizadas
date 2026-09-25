import { describe, expect, it } from "vitest";
import { disenadorStats, disenadoresActivos, filterDisenoTareas, sortDisenoTareas, UNASSIGNED_DISENADOR } from "@/features/diseno/domain/table";
import type { DisenoVista, SortConfig } from "@/features/diseno/domain/table";
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
  ];

  it("solo en_diseno/modificar_diseno, sin importar el rol", () => {
    expect(filterDisenoTareas(rows, { campanaId: "", disenadorId: "", q: "" }).map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("filtra por campaña", () => {
    expect(filterDisenoTareas(rows, { campanaId: "c2", disenadorId: "", q: "" }).map((r) => r.id)).toEqual(["b"]);
  });

  it("filtra por diseñador asignado", () => {
    expect(filterDisenoTareas(rows, { campanaId: "", disenadorId: "d1", q: "" }).map((r) => r.id)).toEqual(["a"]);
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

// ---------------------------------------------------------------------------
// P0-D: vista "enviadas_comercial" + búsqueda por empresa/provincia
// ---------------------------------------------------------------------------
describe("filterDisenoTareas — vista enviadas_comercial", () => {
  const rows = [
    sol({ id: "a", estado: "en_diseno", campana_id: "c1", asignado_id: "d1" }),
    sol({ id: "b", estado: "modificar_diseno", campana_id: "c1", asignado_id: "d2" }),
    sol({ id: "c", estado: "diseno_en_revision_comercial", campana_id: "c1", asignado_id: "d1" }),
    sol({ id: "d", estado: "diseno_en_revision_comercial", campana_id: "c2", asignado_id: "d2" }),
    sol({ id: "e", estado: "confirmada", campana_id: "c1" }),
  ];

  it("1. vista enviadas_comercial solo muestra diseno_en_revision_comercial", () => {
    expect(
      filterDisenoTareas(rows, { campanaId: "", disenadorId: "", q: "", vista: "enviadas_comercial" }).map((r) => r.id)
    ).toEqual(["c", "d"]);
  });

  it("2. vista enviadas_comercial no muestra en_diseno ni modificar_diseno", () => {
    const result = filterDisenoTareas(rows, { campanaId: "", disenadorId: "", q: "", vista: "enviadas_comercial" });
    expect(result.some((r) => r.estado === "en_diseno" || r.estado === "modificar_diseno")).toBe(false);
  });

  it("3. vista operativo explícita solo muestra en_diseno/modificar_diseno", () => {
    expect(
      filterDisenoTareas(rows, { campanaId: "", disenadorId: "", q: "", vista: "operativo" }).map((r) => r.id)
    ).toEqual(["a", "b"]);
  });

  it("4. vista enviadas_comercial respeta el filtro de campaña", () => {
    expect(
      filterDisenoTareas(rows, { campanaId: "c1", disenadorId: "", q: "", vista: "enviadas_comercial" }).map((r) => r.id)
    ).toEqual(["c"]);
  });

  it("5. vista enviadas_comercial respeta el filtro de diseñador", () => {
    expect(
      filterDisenoTareas(rows, { campanaId: "", disenadorId: "d2", q: "", vista: "enviadas_comercial" }).map((r) => r.id)
    ).toEqual(["d"]);
  });
});

describe("filterDisenoTareas — búsqueda por empresa y provincia", () => {
  const rows = [
    sol({ id: "a", estado: "en_diseno", nombre_empresa: "ACME Corp", provincia: "Madrid", cod_sap: "60001" }),
    sol({ id: "b", estado: "en_diseno", nombre_empresa: "Beta SL", provincia: "Barcelona", cod_sap: "60002" }),
    sol({ id: "c", estado: "diseno_en_revision_comercial", nombre_empresa: "ACME Corp", provincia: "Valencia", cod_sap: "60003" }),
  ];

  it("6. búsqueda por nombre_empresa en vista operativo", () => {
    expect(
      filterDisenoTareas(rows, { campanaId: "", disenadorId: "", q: "acme", vista: "operativo" }).map((r) => r.id)
    ).toEqual(["a"]);
  });

  it("7. búsqueda por provincia en vista operativo", () => {
    expect(
      filterDisenoTareas(rows, { campanaId: "", disenadorId: "", q: "barcel", vista: "operativo" }).map((r) => r.id)
    ).toEqual(["b"]);
  });

  it("8. búsqueda por nombre_empresa en vista enviadas_comercial", () => {
    expect(
      filterDisenoTareas(rows, { campanaId: "", disenadorId: "", q: "acme", vista: "enviadas_comercial" }).map((r) => r.id)
    ).toEqual(["c"]);
  });

  it("9. búsqueda por provincia en vista enviadas_comercial", () => {
    expect(
      filterDisenoTareas(rows, { campanaId: "", disenadorId: "", q: "valenc", vista: "enviadas_comercial" }).map((r) => r.id)
    ).toEqual(["c"]);
  });

  it("10. búsqueda es insensible a mayúsculas para empresa y provincia", () => {
    expect(
      filterDisenoTareas(rows, { campanaId: "", disenadorId: "", q: "BETA", vista: "operativo" }).map((r) => r.id)
    ).toEqual(["b"]);
  });

  it("11. búsqueda por SAP sigue funcionando (regresión)", () => {
    expect(
      filterDisenoTareas(rows, { campanaId: "", disenadorId: "", q: "60002", vista: "operativo" }).map((r) => r.id)
    ).toEqual(["b"]);
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
// P0-E: 19 tests for filters + sorting
// ---------------------------------------------------------------------------
describe("P0-E — filterDisenoTareas: nuevos filtros", () => {
  // 1. Filtrar por SAP
  it("1. filtra por SAP (búsqueda exacta parcial)", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno", cod_sap: "60001" }),
      sol({ id: "b", estado: "en_diseno", cod_sap: "70002" }),
    ];
    expect(filterDisenoTareas(rows, { campanaId: "", disenadorId: "", q: "600" }).map((r) => r.id)).toEqual(["a"]);
  });

  // 2. Filtrar por empresa
  it("2. filtra por empresa (búsqueda parcial en nombre_empresa)", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno", nombre_empresa: "ACME Corp" }),
      sol({ id: "b", estado: "en_diseno", nombre_empresa: "Beta SL" }),
    ];
    expect(filterDisenoTareas(rows, { campanaId: "", disenadorId: "", q: "acme" }).map((r) => r.id)).toEqual(["a"]);
  });

  // 3. Filtrar por provincia (selector exacto)
  it("3. filtra por provincia exacta", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno", provincia: "Madrid" }),
      sol({ id: "b", estado: "en_diseno", provincia: "Murcia" }),
      sol({ id: "c", estado: "en_diseno", provincia: "Madrid" }),
    ];
    expect(
      filterDisenoTareas(rows, { campanaId: "", disenadorId: "", q: "", provincia: "Murcia" }).map((r) => r.id)
    ).toEqual(["b"]);
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

  // 5. Filtrar por estado (dentro de vista operativo)
  it("5. filtra por estado exacto dentro de la vista operativo", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno" }),
      sol({ id: "b", estado: "modificar_diseno" }),
    ];
    expect(
      filterDisenoTareas(rows, { campanaId: "", disenadorId: "", q: "", estado: "modificar_diseno" }).map((r) => r.id)
    ).toEqual(["b"]);
  });

  // 6. Combinar varios filtros simultáneamente
  it("6. combina provincia + diseñador + búsqueda simultáneamente", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno", provincia: "Murcia", asignado_id: "d1", nombre_empresa: "Alpha" }),
      sol({ id: "b", estado: "en_diseno", provincia: "Murcia", asignado_id: "d2", nombre_empresa: "Alpha" }),
      sol({ id: "c", estado: "en_diseno", provincia: "Madrid", asignado_id: "d1", nombre_empresa: "Alpha" }),
      sol({ id: "d", estado: "en_diseno", provincia: "Murcia", asignado_id: "d1", nombre_empresa: "Beta" }),
    ];
    expect(
      filterDisenoTareas(rows, { campanaId: "", disenadorId: "d1", q: "alpha", provincia: "Murcia" }).map((r) => r.id)
    ).toEqual(["a"]);
  });

  // 14. Filtros en vista "Solicitudes en diseño"
  it("14. filtros funcionan en vista operativo (estado + diseñador)", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno", asignado_id: "d1" }),
      sol({ id: "b", estado: "modificar_diseno", asignado_id: "d1" }),
      sol({ id: "c", estado: "en_diseno", asignado_id: "d2" }),
    ];
    expect(
      filterDisenoTareas(rows, { campanaId: "", disenadorId: "d1", q: "", vista: "operativo", estado: "en_diseno" }).map((r) => r.id)
    ).toEqual(["a"]);
  });

  // 15. Filtros en vista "Enviadas a Comercial"
  it("15. filtros funcionan en vista enviadas_comercial (provincia)", () => {
    const rows = [
      sol({ id: "a", estado: "diseno_en_revision_comercial", provincia: "Murcia" }),
      sol({ id: "b", estado: "diseno_en_revision_comercial", provincia: "Madrid" }),
      sol({ id: "c", estado: "en_diseno", provincia: "Murcia" }),
    ];
    expect(
      filterDisenoTareas(rows, { campanaId: "", disenadorId: "", q: "", vista: "enviadas_comercial", provincia: "Murcia" }).map((r) => r.id)
    ).toEqual(["a"]);
  });

  // 16. Mantener permisos (estado filter only respects valid states for the vista)
  it("16. estado inválido para la vista actual no filtra resultados (no corta por error)", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno" }),
      sol({ id: "b", estado: "modificar_diseno" }),
    ];
    // "diseno_en_revision_comercial" is not in ESTADOS_DISENO → ignored
    expect(
      filterDisenoTareas(rows, { campanaId: "", disenadorId: "", q: "", vista: "operativo", estado: "diseno_en_revision_comercial" }).map((r) => r.id)
    ).toEqual(["a", "b"]);
  });

  // 17. Mantener paginación (no slicing)
  it("17. sin filtros devuelve todos los en_diseno/modificar_diseno sin truncar", () => {
    const rows = Array.from({ length: 50 }, (_, i) =>
      sol({ id: String(i), estado: i % 2 === 0 ? "en_diseno" : "modificar_diseno" })
    );
    expect(filterDisenoTareas(rows, { campanaId: "", disenadorId: "", q: "" })).toHaveLength(50);
  });

  // 18. Búsqueda global + filtro simultáneo
  it("18. búsqueda q + filtro provincia se aplican simultáneamente", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno", cod_sap: "60001", provincia: "Murcia" }),
      sol({ id: "b", estado: "en_diseno", cod_sap: "60002", provincia: "Murcia" }),
      sol({ id: "c", estado: "en_diseno", cod_sap: "60001", provincia: "Madrid" }),
    ];
    expect(
      filterDisenoTareas(rows, { campanaId: "", disenadorId: "", q: "60001", provincia: "Murcia" }).map((r) => r.id)
    ).toEqual(["a"]);
  });

  // 19. Sin filtros → mismo resultado que antes
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

  // 7. Ordenar por SAP
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

  // 8. Ordenar por empresa
  it("8. ordena por nombre_empresa ascendente", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno", nombre_empresa: "Zeta" }),
      sol({ id: "b", estado: "en_diseno", nombre_empresa: "Alpha" }),
    ];
    expect(sortDisenoTareas(rows, { field: "nombre_empresa", dir: "asc" }, noPerfiles).map((r) => r.id)).toEqual(["b", "a"]);
  });

  // 9. Ordenar por provincia
  it("9. ordena por provincia ascendente", () => {
    const rows = [
      sol({ id: "a", estado: "en_diseno", provincia: "Valencia" }),
      sol({ id: "b", estado: "en_diseno", provincia: "Madrid" }),
      sol({ id: "c", estado: "en_diseno", provincia: "Barcelona" }),
    ];
    expect(sortDisenoTareas(rows, { field: "provincia", dir: "asc" }, noPerfiles).map((r) => r.id)).toEqual(["c", "b", "a"]);
  });

  // 10. Ordenar por ROLY
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

  // 11. Ordenar por fecha
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

  // 12. Ordenar por diseñador
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

  // 13. Ordenar por estado
  it("13. ordena por estado ascendente (en_diseno < modificar_diseno)", () => {
    const rows = [
      sol({ id: "a", estado: "modificar_diseno" }),
      sol({ id: "b", estado: "en_diseno" }),
    ];
    expect(sortDisenoTareas(rows, { field: "estado", dir: "asc" }, noPerfiles).map((r) => r.id)).toEqual(["b", "a"]);
  });

  // sort=null devuelve el mismo orden
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
    // pendientes=modificar_diseno, enDiseno=en_diseno, mandadas=diseno_en_revision_comercial, aprobadas=confirmada
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
    // en_diseno → enDiseno; solo c1 pasa el filtro
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
