import { describe, expect, it } from "vitest";
import { buildExportRows, buildResumenRows, exportCatalogos, exportFilename } from "@/features/panel-global/domain/export-excel";
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
    estado: "confirmada",
    updated_at: "2026-01-01T00:00:00Z",
    solicitud_catalogos: [],
    adjuntos: [],
    ...overrides,
  };
}

const perfiles = [{ id: "u1", nombre: "Ana García", rol: "comercial_nacional", activo: true }];
const campanaCatalogosPorId = new Map<string, string[] | null>([["c1", ["roly"]]]);

describe("exportCatalogos", () => {
  it("usa los catálogos de la campaña si existen", () => {
    expect(exportCatalogos(["roly", "xmas"]).map((c) => c.key)).toEqual(["roly", "xmas"]);
  });

  it("sin campaña, usa los 4 catálogos", () => {
    expect(exportCatalogos(null).map((c) => c.key)).toEqual(["roly", "roly_wrk", "stamina", "xmas"]);
  });
});

describe("buildExportRows", () => {
  it("una fila por solicitud con los datos generales y el nombre del comercial resuelto", () => {
    const rows = buildExportRows([sol()], exportCatalogos(["roly"]), perfiles, campanaCatalogosPorId);
    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(row?.[0]).toBe("60239");
    expect(row?.[1]).toBe("ACME");
    expect(row?.[2]).toBe("Ana García");
  });

  it("catálogo con diseño propio añade la columna de con_precios", () => {
    const rows = buildExportRows(
      [
        sol({
          solicitud_catalogos: [
            {
              catalogo: "stamina",
              catalogo_digital: true,
              catalogo_impreso: true,
              unidades: 10,
              portada_personalizada: true,
              portada_diseno_propio: false,
              portada_opcion_1: "A",
              portada_opcion_2: null,
              portada_opcion_3: null,
              portada_elegida: null,
              posicion_logo: "A",
              con_precios: true,
            },
          ],
        }),
      ],
      exportCatalogos(["stamina"]),
      perfiles,
      new Map([["c1", ["stamina"]]])
    );
    const row = rows[0];
    // 5 columnas generales + 10 de stamina (9 + con_precios)
    expect(row).toHaveLength(5 + 10 + 3);
    expect(row?.[row.length - 4]).toBe("CON PRECIOS");
  });

  it("última columna: '✓ Completa' o la lista de campos faltantes, usando la campaña de LA SOLICITUD, no la del export", () => {
    const rows = buildExportRows(
      [sol({ campana_id: "c1", provincia: null, idioma: "Español", solicitud_catalogos: [] })],
      exportCatalogos(["xmas"]), // columnas del export: xmas
      perfiles,
      new Map([["c1", ["roly"]]]) // pero la campaña de la solicitud solo tiene roly
    );
    // Sin provincia y sin ningún catálogo tocado → falta "Provincia"
    expect(rows[0]?.at(-1)).toBe("Provincia");
  });
});

describe("buildResumenRows", () => {
  it("cuenta sobre TODAS las solicitudes pasadas, no filtra por campaña (PAN-11, replicado tal cual)", () => {
    const todas = [sol({ id: "a", campana_id: "c1", estado: "confirmada" }), sol({ id: "b", campana_id: "c2", estado: "borrador" })];
    const rows = buildResumenRows(todas, campanaCatalogosPorId, "Navidad 2026", "2026-08-04");
    expect(rows[0]).toEqual(["Campaña", "Navidad 2026"]);
    expect(rows[2]).toEqual(["Total solicitudes", 2]);
    expect(rows[5]).toEqual(["Confirmadas", 1]);
  });
});

describe("exportFilename", () => {
  it("reemplaza espacios por guion bajo", () => {
    expect(exportFilename("Navidad 2026", "2026-08-04")).toBe("Navidad_2026_2026-08-04.xlsx");
  });

  it("sin campaña, usa 'Portadas'", () => {
    expect(exportFilename(null, "2026-08-04")).toBe("Portadas_2026-08-04.xlsx");
  });
});
