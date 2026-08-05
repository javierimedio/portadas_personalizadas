import { describe, expect, it } from "vitest";
import {
  comercialesFiltroMisSolicitudes,
  filterSolicitudes,
  isExportRole,
  miniStats,
  muestraFiltroComercial,
  scopeSolicitudesByRole,
  type SolicitudListItem,
} from "@/features/solicitudes/domain/table";

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
    estado: "borrador",
    updated_at: "2026-01-01T00:00:00Z",
    solicitud_catalogos: [],
    adjuntos: [],
    ...overrides,
  };
}

describe("scopeSolicitudesByRole", () => {
  const rows = [sol({ id: "a", comercial_id: "u1", canal: "nacional" }), sol({ id: "b", comercial_id: "u2", canal: "exportacion" })];
  const perfiles = [
    { id: "u1", rol: "comercial_nacional" },
    { id: "u2", rol: "comercial_exportacion" },
  ];

  it("admin/marketing: sin restricción adicional (ya la aplica RLS)", () => {
    expect(scopeSolicitudesByRole(rows, perfiles, "admin", "admin-id")).toHaveLength(2);
    expect(scopeSolicitudesByRole(rows, perfiles, "marketing", "mkt-id")).toHaveLength(2);
  });

  it("comercial_nacional/exportacion: solo sus propias filas (comercial_id === usuario actual)", () => {
    expect(scopeSolicitudesByRole(rows, perfiles, "comercial_nacional", "u1")).toEqual([rows[0]]);
    expect(scopeSolicitudesByRole(rows, perfiles, "comercial_nacional", "otro-id")).toEqual([]);
  });

  it("responsable_nacional/exportacion: comerciales de su canal o canal coincidente", () => {
    expect(scopeSolicitudesByRole(rows, perfiles, "responsable_nacional", "resp-id")).toEqual([rows[0]]);
    expect(scopeSolicitudesByRole(rows, perfiles, "responsable_exportacion", "resp-id")).toEqual([rows[1]]);
  });
});

describe("isExportRole", () => {
  it("solo comercial_exportacion y responsable_exportacion", () => {
    expect(isExportRole("comercial_exportacion")).toBe(true);
    expect(isExportRole("responsable_exportacion")).toBe(true);
    expect(isExportRole("comercial_nacional")).toBe(false);
    expect(isExportRole(null)).toBe(false);
  });
});

describe("filterSolicitudes", () => {
  const rows = [
    sol({ id: "a", cod_sap: "60239", nombre_empresa: "ACME", campana_id: "c1", estado: "borrador" }),
    sol({ id: "b", cod_sap: "70001", nombre_empresa: "OTRA", campana_id: "c2", estado: "enviada" }),
    sol({ id: "c", cod_sap: "80002", nombre_empresa: "ARCHIVADA CO", campana_id: "c1", estado: "archivada" }),
  ];

  const base = { campanaId: "", estado: "", q: "", comercialId: "", idioma: "" };

  it("sin filtro de estado, oculta archivadas", () => {
    const result = filterSolicitudes(rows, base);
    expect(result.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("con filtro de estado explícito, muestra incluso archivadas", () => {
    const result = filterSolicitudes(rows, { ...base, estado: "archivada" });
    expect(result.map((r) => r.id)).toEqual(["c"]);
  });

  it("filtra por campaña", () => {
    const result = filterSolicitudes(rows, { ...base, campanaId: "c2" });
    expect(result.map((r) => r.id)).toEqual(["b"]);
  });

  it("busca por código SAP o nombre de empresa (case-insensitive)", () => {
    expect(filterSolicitudes(rows, { ...base, q: "acme" }).map((r) => r.id)).toEqual(["a"]);
    expect(filterSolicitudes(rows, { ...base, q: "70001" }).map((r) => r.id)).toEqual(["b"]);
  });

  it("filtra por comercial", () => {
    const conComercial = [sol({ id: "a", comercial_id: "u1" }), sol({ id: "b", comercial_id: "u2" })];
    expect(filterSolicitudes(conComercial, { ...base, comercialId: "u2" }).map((r) => r.id)).toEqual(["b"]);
  });

  it("filtra por idioma (case-insensitive)", () => {
    const conIdioma = [sol({ id: "a", idioma: "Inglés" }), sol({ id: "b", idioma: "Francés" })];
    expect(filterSolicitudes(conIdioma, { ...base, idioma: "inglés" }).map((r) => r.id)).toEqual(["a"]);
  });
});

describe("muestraFiltroComercial", () => {
  it("visible para responsables, admin y marketing; no para comerciales", () => {
    expect(muestraFiltroComercial("responsable_nacional")).toBe(true);
    expect(muestraFiltroComercial("responsable_exportacion")).toBe(true);
    expect(muestraFiltroComercial("admin")).toBe(true);
    expect(muestraFiltroComercial("marketing")).toBe(true);
    expect(muestraFiltroComercial("comercial_nacional")).toBe(false);
    expect(muestraFiltroComercial(null)).toBe(false);
  });
});

describe("comercialesFiltroMisSolicitudes", () => {
  const perfiles = [
    { id: "u1", nombre: "Ana", rol: "comercial_nacional", activo: true },
    { id: "u2", nombre: "Bea", rol: "comercial_exportacion", activo: true },
    { id: "u3", nombre: "Carlos", rol: "responsable_nacional", activo: true },
    { id: "u4", nombre: "Diego", rol: "responsable_exportacion", activo: true },
    { id: "u6", nombre: "Inactivo", rol: "comercial_nacional", activo: false },
  ];

  it("responsable_nacional: solo su colectivo (comercial_nacional + responsable_nacional)", () => {
    expect(comercialesFiltroMisSolicitudes(perfiles, "responsable_nacional").map((p) => p.id)).toEqual(["u1", "u3"]);
  });

  it("responsable_exportacion: solo su colectivo (comercial_exportacion + responsable_exportacion)", () => {
    expect(comercialesFiltroMisSolicitudes(perfiles, "responsable_exportacion").map((p) => p.id)).toEqual(["u2", "u4"]);
  });

  it("admin/marketing: comerciales rasos de los 2 canales, sin responsables (H-07: sin el rol legacy 'comercial' genérico)", () => {
    expect(comercialesFiltroMisSolicitudes(perfiles, "admin").map((p) => p.id)).toEqual(["u1", "u2"]);
  });
});

describe("miniStats", () => {
  it("Total excluye archivadas; el resto cuenta por estado exacto (en_diseno suma modificar_diseno)", () => {
    const rows = [
      sol({ estado: "borrador" }),
      sol({ estado: "enviada" }),
      sol({ estado: "en_diseno" }),
      sol({ estado: "modificar_diseno" }),
      sol({ estado: "archivada" }),
    ];
    const stats = miniStats(rows);
    expect(stats.map((s) => s.num)).toEqual([4, 1, 1, 0, 2, 0, 0]);
  });
});
