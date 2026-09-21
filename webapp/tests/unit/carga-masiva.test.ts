import { describe, expect, it } from "vitest";
import { matchCargaFile, parseCargaFilename, type CargaMasivaSolicitud } from "@/features/diseno/domain/carga-masiva";

// INVARIANTE DE INTEGRIDAD: procesarCargaMasiva() NO debe escribir nunca en
// solicitud_catalogos.portada_elegida. El adjunto de diseño se registra en la
// tabla `adjuntos` (tipo "diseno_portada") y la portada elegida original queda
// intacta. Los tests de esta suite verifican el parseo y emparejamiento de
// nombres de archivo, que son los únicos datos que alimentan esa lógica.

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

  it("SAPs de las solicitudes afectadas por el bug de sobrescritura (25532, 35131, 38966, 37249, 13363, 74688, 66732)", () => {
    // Estos SAPs generaron valores corruptos en portada_elegida ("25532_roly", etc.)
    // porque el nombre del archivo se escribía en el campo en lugar del número de portada.
    expect(parseCargaFilename("25532_roly.pdf")).toEqual({ sap: "25532", catKey: "roly" });
    expect(parseCargaFilename("25532_wrk.pdf")).toEqual({ sap: "25532", catKey: "roly_wrk" });
    expect(parseCargaFilename("25532_stm.pdf")).toEqual({ sap: "25532", catKey: "stamina" });
    expect(parseCargaFilename("35131_roly.pdf")).toEqual({ sap: "35131", catKey: "roly" });
    expect(parseCargaFilename("35131_stm.pdf")).toEqual({ sap: "35131", catKey: "stamina" });
    expect(parseCargaFilename("38966_roly.pdf")).toEqual({ sap: "38966", catKey: "roly" });
    expect(parseCargaFilename("37249_roly.pdf")).toEqual({ sap: "37249", catKey: "roly" });
    expect(parseCargaFilename("13363_roly.pdf")).toEqual({ sap: "13363", catKey: "roly" });
    expect(parseCargaFilename("74688_roly.pdf")).toEqual({ sap: "74688", catKey: "roly" });
    expect(parseCargaFilename("66732_stm.pdf")).toEqual({ sap: "66732", catKey: "stamina" });
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

  it("el resultado de match nunca contiene portada_elegida — no hay campo que pueda sobrescribirse", () => {
    const m = matchCargaFile("25532_roly.pdf", [
      sol({ cod_sap: "25532", solicitud_catalogos: [{ catalogo: "roly", portada_personalizada: true }] }),
    ]);
    expect(m.status).toBe("ok");
    // CargaMatch solo expone { status, fileName, sap, catKey, solId, nombreEmpresa }.
    // portada_elegida no forma parte del resultado — la Action solo usa estos
    // campos para insertar el adjunto y cambiar estado; nunca para escribir
    // en solicitud_catalogos.
    expect(m).not.toHaveProperty("portada_elegida");
    if (m.status === "ok") {
      expect(m.sap).toBe("25532");
      expect(m.catKey).toBe("roly");
    }
  });
});
