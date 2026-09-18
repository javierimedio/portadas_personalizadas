import { describe, expect, it } from "vitest";
import { disenadorStats, disenadoresActivos, filterDisenoTareas, UNASSIGNED_DISENADOR } from "@/features/diseno/domain/table";
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
