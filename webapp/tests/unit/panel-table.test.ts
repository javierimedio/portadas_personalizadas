import { describe, expect, it } from "vitest";
import { comercialesFiltro, filterPanelRows, sortPanelRows } from "@/features/panel-global/domain/table";
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
