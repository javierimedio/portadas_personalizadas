import { describe, expect, it } from "vitest";
import { missingFields } from "@/features/panel-global/domain/missing-fields";

function cat(overrides: Partial<{
  catalogo: string;
  catalogo_digital: boolean | null;
  catalogo_impreso: boolean | null;
  portada_personalizada: boolean | null;
  portada_diseno_propio: boolean | null;
  portada_opcion_1: string | null;
  posicion_logo: string | null;
  unidades: number | null;
}> = {}) {
  return {
    catalogo: "roly",
    catalogo_digital: true,
    catalogo_impreso: true,
    portada_personalizada: true,
    portada_diseno_propio: false,
    portada_opcion_1: "Playa",
    posicion_logo: "A",
    unidades: 100,
    ...overrides,
  };
}

describe("missingFields", () => {
  it("solicitud completa: sin campos faltantes", () => {
    expect(missingFields({ provincia: "Madrid", idioma: "Español", campana_catalogos: ["roly"], solicitud_catalogos: [cat()] })).toEqual([]);
  });

  it("provincia obligatoria solo si el idioma es Español (o no hay idioma)", () => {
    expect(missingFields({ provincia: null, idioma: "Español", campana_catalogos: [], solicitud_catalogos: [] })).toContain("Provincia");
    expect(missingFields({ provincia: null, idioma: null, campana_catalogos: [], solicitud_catalogos: [] })).toContain("Provincia");
    expect(missingFields({ provincia: null, idioma: "Inglés", campana_catalogos: [], solicitud_catalogos: [] })).not.toContain("Provincia");
  });

  it("catálogo no tocado (digital e impreso null) no genera ningún campo faltante", () => {
    const missing = missingFields({
      provincia: "Madrid",
      idioma: "Español",
      campana_catalogos: ["roly"],
      solicitud_catalogos: [cat({ catalogo_digital: null, catalogo_impreso: null })],
    });
    expect(missing).toEqual([]);
  });

  it("catálogo tocado pero impreso/digital sin definir", () => {
    const missing = missingFields({
      provincia: "Madrid",
      idioma: "Español",
      campana_catalogos: ["roly"],
      solicitud_catalogos: [cat({ catalogo_impreso: null })],
    });
    expect(missing).toContain("Cat. imp. roly");
  });

  it("portada personalizada sin diseño propio requiere opción y posición de logo", () => {
    const missing = missingFields({
      provincia: "Madrid",
      idioma: "Español",
      campana_catalogos: ["roly"],
      solicitud_catalogos: [cat({ portada_opcion_1: null, posicion_logo: null })],
    });
    expect(missing).toContain("Portada ROLY");
    expect(missing).toContain("Pos. logo roly");
  });

  it("diseño propio no exige opción ni posición de logo", () => {
    const missing = missingFields({
      provincia: "Madrid",
      idioma: "Español",
      campana_catalogos: ["roly"],
      solicitud_catalogos: [cat({ portada_diseno_propio: true, portada_opcion_1: null, posicion_logo: null })],
    });
    expect(missing).toEqual([]);
  });

  it("impreso sin unidades", () => {
    const missing = missingFields({
      provincia: "Madrid",
      idioma: "Español",
      campana_catalogos: ["roly"],
      solicitud_catalogos: [cat({ unidades: null })],
    });
    expect(missing).toContain("Unidades roly");
  });
});
