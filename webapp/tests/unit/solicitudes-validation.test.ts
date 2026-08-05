import { describe, expect, it } from "vitest";
import { IDIOMAS, PROVINCIAS } from "@/features/solicitudes/domain/constants";
import {
  formatearErrores,
  validateCatalogosParaEnvio,
  validateDatosGenerales,
  type CatalogoFormInput,
} from "@/features/solicitudes/domain/validation";
import { catSummary } from "@/features/solicitudes/domain/cat-summary";
import { ALL_CATALOGOS } from "@/shared/domain/catalogos";

describe("constantes", () => {
  // Contadas directamente del <select> real de index.html (~1039-1124):
  // 24 idiomas y 52 provincias/países, no 25/54 como decía la matriz de
  // paridad antes de esta corrección (docs/09-matriz-paridad-funcional.md
  // § SOL-03/SOL-04).
  it("24 idiomas, empezando por Español", () => {
    expect(IDIOMAS).toHaveLength(24);
    expect(IDIOMAS[0]).toBe("Español");
  });

  it("52 provincias/países, terminando en Ceuta/Melilla", () => {
    expect(PROVINCIAS).toHaveLength(52);
    expect(PROVINCIAS.slice(-2)).toEqual(["Ceuta", "Melilla"]);
  });
});

describe("validateDatosGenerales", () => {
  it("exige código SAP e idioma", () => {
    expect(validateDatosGenerales({ codSap: "", idioma: "", provincia: "" })).toEqual([
      "Código SAP",
      "Idioma",
    ]);
  });

  it("provincia solo obligatoria si el idioma es Español", () => {
    expect(validateDatosGenerales({ codSap: "60239", idioma: "Inglés", provincia: "" })).toEqual([]);
    expect(validateDatosGenerales({ codSap: "60239", idioma: "Español", provincia: "" })).toEqual([
      "Provincia / Región",
    ]);
    expect(validateDatosGenerales({ codSap: "60239", idioma: "Español", provincia: "Madrid" })).toEqual([]);
  });
});

function cat(overrides: Partial<CatalogoFormInput> = {}): CatalogoFormInput {
  return {
    key: "roly",
    label: "ROLY",
    digital: null,
    impreso: null,
    unidades: null,
    hasDisenoProp: false,
    ...overrides,
  };
}

describe("validateCatalogosParaEnvio", () => {
  it("exige al menos un catálogo tocado para enviar", () => {
    expect(validateCatalogosParaEnvio([cat()])).toEqual(["Al menos un catálogo debe estar configurado"]);
  });

  it("catálogo no tocado (digital e impreso null) se ignora aunque haya otros tocados", () => {
    const errors = validateCatalogosParaEnvio([
      cat({ key: "roly", digital: true }),
      cat({ key: "xmas" }), // no tocado
    ]);
    expect(errors).toEqual([]);
  });

  it("impreso=true sin unidades es un error", () => {
    const errors = validateCatalogosParaEnvio([cat({ label: "ROLY", impreso: true, unidades: null })]);
    expect(errors).toEqual(["ROLY — Unidades"]);
  });

  it("impreso=true con unidades no da error", () => {
    expect(validateCatalogosParaEnvio([cat({ impreso: true, unidades: 50 })])).toEqual([]);
  });

  it("impreso=false (tocado vía digital) no exige unidades", () => {
    expect(validateCatalogosParaEnvio([cat({ digital: true, impreso: false })])).toEqual([]);
  });

  it("impreso=false SIN digital tocado no cuenta como tocado (~2859-2866, replicado tal cual)", () => {
    const errors = validateCatalogosParaEnvio([cat({ digital: null, impreso: false })]);
    expect(errors).toEqual(["Al menos un catálogo debe estar configurado"]);
  });

  it("portada personalizada sin diseño propio exige selección 1 y posición de logo", () => {
    const errors = validateCatalogosParaEnvio([
      cat({ label: "STAMINA", digital: true, portadaPersonalizada: true, hasDisenoProp: true }),
    ]);
    expect(errors).toEqual(["STAMINA — Selección 1", "STAMINA — Posición logo"]);
  });

  it("portada personalizada con diseño propio (solo Stamina/XMAS) exime de selección y posición", () => {
    const errors = validateCatalogosParaEnvio([
      cat({ digital: true, portadaPersonalizada: true, hasDisenoProp: true, disenoPropio: true }),
    ]);
    expect(errors).toEqual([]);
  });
});

describe("formatearErrores", () => {
  it("hasta 3 errores, sin sufijo", () => {
    expect(formatearErrores(["A", "B", "C"])).toBe("Completa los campos obligatorios: A, B, C");
  });

  it("más de 3 errores, trunca a 3 + contador", () => {
    expect(formatearErrores(["A", "B", "C", "D", "E"])).toBe(
      "Completa los campos obligatorios: A, B, C y 2 más"
    );
  });
});

describe("catSummary", () => {
  const roly = ALL_CATALOGOS.find((c) => c.key === "roly")!;

  it("sin fila de catálogo => empty", () => {
    expect(catSummary(undefined, roly)).toEqual({ variant: "empty" });
  });

  it("digital e impreso ambos null => empty (catálogo no tocado)", () => {
    expect(
      catSummary(
        { catalogo_digital: null, catalogo_impreso: null, unidades: null, portada_personalizada: null, portada_diseno_propio: null, portada_opcion_1: null },
        roly
      )
    ).toEqual({ variant: "empty" });
  });

  it("tocado pero ambos false => no", () => {
    expect(
      catSummary(
        { catalogo_digital: false, catalogo_impreso: false, unidades: null, portada_personalizada: null, portada_diseno_propio: null, portada_opcion_1: null },
        roly
      )
    ).toEqual({ variant: "no" });
  });

  it("con unidades y sin portada => summary sin portadaLabel", () => {
    expect(
      catSummary(
        { catalogo_digital: true, catalogo_impreso: true, unidades: 120, portada_personalizada: false, portada_diseno_propio: null, portada_opcion_1: null },
        roly
      )
    ).toEqual({ variant: "summary", unidades: 120, portadaLabel: null, chipColor: roly.color });
  });

  it("con portada y diseño propio => 'Propio'", () => {
    const stamina = ALL_CATALOGOS.find((c) => c.key === "stamina")!;
    expect(
      catSummary(
        { catalogo_digital: true, catalogo_impreso: true, unidades: 80, portada_personalizada: true, portada_diseno_propio: true, portada_opcion_1: null },
        stamina
      )
    ).toEqual({ variant: "summary", unidades: 80, portadaLabel: "Propio", chipColor: stamina.color });
  });
});
