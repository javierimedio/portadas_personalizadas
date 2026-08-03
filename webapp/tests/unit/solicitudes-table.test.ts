import { describe, expect, it } from "vitest";
import { filterSolicitudes, isExportRole, miniStats, scopeSolicitudesByRole, type SolicitudListItem } from "@/features/solicitudes/domain/table";

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
    estado: "borrador",
    updated_at: "2026-01-01T00:00:00Z",
    solicitud_catalogos: [],
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

  it("sin filtro de estado, oculta archivadas", () => {
    const result = filterSolicitudes(rows, { campanaId: "", estado: "", q: "" });
    expect(result.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("con filtro de estado explícito, muestra incluso archivadas", () => {
    const result = filterSolicitudes(rows, { campanaId: "", estado: "archivada", q: "" });
    expect(result.map((r) => r.id)).toEqual(["c"]);
  });

  it("filtra por campaña", () => {
    const result = filterSolicitudes(rows, { campanaId: "c2", estado: "", q: "" });
    expect(result.map((r) => r.id)).toEqual(["b"]);
  });

  it("busca por código SAP o nombre de empresa (case-insensitive)", () => {
    expect(filterSolicitudes(rows, { campanaId: "", estado: "", q: "acme" }).map((r) => r.id)).toEqual(["a"]);
    expect(filterSolicitudes(rows, { campanaId: "", estado: "", q: "70001" }).map((r) => r.id)).toEqual(["b"]);
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
