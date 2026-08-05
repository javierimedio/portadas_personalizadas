import { describe, expect, it } from "vitest";
import { disenadorStats, disenadoresActivos, filterDisenoTareas } from "@/features/diseno/domain/table";
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
    expect(filterDisenoTareas(rows, { campanaId: "", disenadorId: "" }).map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("filtra por campaña", () => {
    expect(filterDisenoTareas(rows, { campanaId: "c2", disenadorId: "" }).map((r) => r.id)).toEqual(["b"]);
  });

  it("filtra por diseñador asignado", () => {
    expect(filterDisenoTareas(rows, { campanaId: "", disenadorId: "d1" }).map((r) => r.id)).toEqual(["a"]);
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

  it("colorea por umbral: 0 = mid, >5 = red, resto = green", () => {
    const rows = [
      ...Array.from({ length: 6 }, (_, i) => sol({ id: `x${i}`, asignado_id: "d1" })),
      sol({ id: "y1", asignado_id: "d2" }),
    ];
    const stats = disenadorStats(rows, perfiles);
    expect(stats).toEqual([
      { id: "d1", nombre: "Ana García", count: 6, color: "red" },
      { id: "d2", nombre: "Bea López", count: 1, color: "green" },
    ]);
  });
});
