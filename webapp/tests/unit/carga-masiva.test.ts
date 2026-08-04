import { describe, expect, it } from "vitest";
import { matchCargaFile, parseCargaFilename, type CargaMasivaSolicitud } from "@/features/diseno/domain/carga-masiva";

describe("parseCargaFilename", () => {
  it("solo SAP, sin sufijo de catálogo", () => {
    expect(parseCargaFilename("665874.pdf")).toEqual({ sap: "665874", catKey: null });
  });

  it("sufijo _ROLY_WRK se evalúa antes que _ROLY, para no capturarlo mal", () => {
    expect(parseCargaFilename("665874_ROLY_WRK.pdf")).toEqual({ sap: "665874", catKey: "roly_wrk" });
    expect(parseCargaFilename("665874_roly.pdf")).toEqual({ sap: "665874", catKey: "roly" });
  });

  it("sufijos alternativos de stamina y wrk", () => {
    expect(parseCargaFilename("60239_STAMINA.jpg")).toEqual({ sap: "60239", catKey: "stamina" });
    expect(parseCargaFilename("60239_STM.jpg")).toEqual({ sap: "60239", catKey: "stamina" });
    expect(parseCargaFilename("60239_WRK.jpg")).toEqual({ sap: "60239", catKey: "roly_wrk" });
    expect(parseCargaFilename("60239_xmas.ai")).toEqual({ sap: "60239", catKey: "xmas" });
  });
});

function sol(overrides: Partial<CargaMasivaSolicitud> = {}): CargaMasivaSolicitud {
  return {
    id: "s1",
    cod_sap: "60239",
    nombre_empresa: "ACME",
    estado: "en_diseno",
    solicitud_catalogos: [{ catalogo: "roly", portada_personalizada: true }],
    ...overrides,
  };
}

describe("matchCargaFile", () => {
  it("ok cuando el SAP existe en diseño y (si hay catálogo) tiene portada personalizada", () => {
    const m = matchCargaFile("60239_roly.pdf", [sol()]);
    expect(m).toEqual({ status: "ok", fileName: "60239_roly.pdf", sap: "60239", catKey: "roly", solId: "s1", nombreEmpresa: "ACME" });
  });

  it("ok sin sufijo de catálogo (aplica a todos)", () => {
    const m = matchCargaFile("60239.pdf", [sol()]);
    expect(m.status).toBe("ok");
  });

  it("notfound si el SAP no existe entre las solicitudes en diseño", () => {
    const m = matchCargaFile("99999.pdf", [sol()]);
    expect(m).toEqual({ status: "notfound", fileName: "99999.pdf", sap: "99999", catKey: null });
  });

  it("notfound si el SAP existe pero no está en en_diseno/modificar_diseno", () => {
    const m = matchCargaFile("60239.pdf", [sol({ estado: "confirmada" })]);
    expect(m.status).toBe("notfound");
  });

  it("nocatalog si el catálogo del sufijo no tiene portada personalizada en esa solicitud", () => {
    const m = matchCargaFile("60239_xmas.pdf", [sol()]);
    expect(m).toEqual({ status: "nocatalog", fileName: "60239_xmas.pdf", sap: "60239", catKey: "xmas", solId: "s1", nombreEmpresa: "ACME" });
  });

  it("no filtra por campaña — solo por SAP + estado", () => {
    const m = matchCargaFile("60239.pdf", [sol({ id: "otra-campana" })]);
    expect(m.status).toBe("ok");
  });
});
