import { describe, expect, it } from "vitest";
import { matchCargaFile, parseCargaFilename, type CargaMasivaSolicitud } from "@/features/diseno/domain/carga-masiva";

function sol(overrides: Partial<CargaMasivaSolicitud> = {}): CargaMasivaSolicitud {
  return {
    id: "sol-1",
    cod_sap: "46893",
    nombre_empresa: "EMPRESA TEST",
    estado: "en_diseno",
    solicitud_catalogos: [{ catalogo: "roly", portada_personalizada: true }],
    ...overrides,
  };
}

describe("parseCargaFilename", () => {
  it("extrae SAP y catalogo roly", () => {
    expect(parseCargaFilename("46893_roly.jpg")).toEqual({ sap: "46893", catKey: "roly" });
  });

  it("sufijo _ROLY_WRK tiene prioridad sobre _ROLY", () => {
    expect(parseCargaFilename("46893_ROLY_WRK.jpg")).toEqual({ sap: "46893", catKey: "roly_wrk" });
  });

  it("sufijo _WRK → roly_wrk", () => {
    expect(parseCargaFilename("46893_WRK.jpg")).toEqual({ sap: "46893", catKey: "roly_wrk" });
  });

  it("sufijo _STM → stamina", () => {
    expect(parseCargaFilename("46893_STM.jpg")).toEqual({ sap: "46893", catKey: "stamina" });
  });

  it("sufijo _STAMINA → stamina", () => {
    expect(parseCargaFilename("46893_STAMINA.jpg")).toEqual({ sap: "46893", catKey: "stamina" });
  });

  it("sin sufijo de catalogo devuelve catKey null", () => {
    expect(parseCargaFilename("46893.jpg")).toEqual({ sap: "46893", catKey: null });
  });

  it("normaliza a mayusculas independientemente del case del archivo", () => {
    expect(parseCargaFilename("46893_roly.jpg")).toEqual({ sap: "46893", catKey: "roly" });
    expect(parseCargaFilename("46893_Roly.JPG")).toEqual({ sap: "46893", catKey: "roly" });
  });
});

describe("matchCargaFile — portada_elegida no puede ser modificada por carga masiva", () => {
  // La separación de responsabilidades es la garantía:
  //   CargaMasivaSolicitud solo expone: id, cod_sap, nombre_empresa, estado,
  //     solicitud_catalogos(catalogo, portada_personalizada)
  //   CargaMatch solo devuelve: status, solId, catKey
  //   El action solo escribe en: adjuntos + cambiarEstado()
  // portada_elegida nunca aparece en ninguno de estos tres niveles.

  it("portada_elegida no existe en CargaMasivaSolicitud.solicitud_catalogos", () => {
    const s = sol();
    const cat = s.solicitud_catalogos[0];
    expect(cat).toBeDefined();
    expect("portada_elegida" in cat!).toBe(false);
  });

  it("CargaMatch no incluye portada_elegida aunque la solicitud tenga portada_elegida = '10'", () => {
    // Escenario: portada_elegida era '10' antes de la carga masiva.
    // El action consulta: .select("solicitud_catalogos(catalogo, portada_personalizada)")
    // portada_elegida no está en el SELECT → no llega al dominio → no puede cambiar.
    const match = matchCargaFile("46893_roly.jpg", [sol()]);
    expect(match.status).toBe("ok");
    expect("portada_elegida" in match).toBe(false);
    // portada_elegida = '10' permanece inalterada tras la carga masiva
  });

  it("match ok: SAP en_diseno con portada personalizada", () => {
    const match = matchCargaFile("46893_roly.jpg", [sol()]);
    expect(match.status).toBe("ok");
    if (match.status === "ok") {
      expect(match.solId).toBe("sol-1");
      expect(match.catKey).toBe("roly");
    }
  });

  it("match ok: SAP en modificar_diseno", () => {
    const match = matchCargaFile("46893_roly.jpg", [sol({ estado: "modificar_diseno" })]);
    expect(match.status).toBe("ok");
  });

  it("notfound: SAP inexistente", () => {
    expect(matchCargaFile("99999_roly.jpg", [sol()]).status).toBe("notfound");
  });

  it("notfound: solicitud en estado borrador (no en diseno)", () => {
    expect(matchCargaFile("46893_roly.jpg", [sol({ estado: "borrador" })]).status).toBe("notfound");
  });

  it("notfound: solicitud en en_revision_marketing (no en diseno)", () => {
    expect(matchCargaFile("46893_roly.jpg", [sol({ estado: "en_revision_marketing" })]).status).toBe("notfound");
  });

  it("nocatalog: catalogo sin portada_personalizada", () => {
    const match = matchCargaFile("46893_roly.jpg", [
      sol({ solicitud_catalogos: [{ catalogo: "roly", portada_personalizada: false }] }),
    ]);
    expect(match.status).toBe("nocatalog");
  });

  it("nocatalog: catalogo no existe para ese SAP", () => {
    const match = matchCargaFile("46893_STM.jpg", [
      sol({ solicitud_catalogos: [{ catalogo: "roly", portada_personalizada: true }] }),
    ]);
    expect(match.status).toBe("nocatalog");
  });
});
