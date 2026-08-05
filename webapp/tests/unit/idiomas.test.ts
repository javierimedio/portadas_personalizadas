import { describe, expect, it } from "vitest";
import { resolverInstruccionesUrl } from "@/shared/domain/idiomas";

const covers = {
  roly: { Inglés: "https://x/roly-en.pdf", Español: "https://x/roly-es.pdf" },
};

describe("resolverInstruccionesUrl", () => {
  it("usa el PDF del propio idioma cuando tiene documento propio", () => {
    expect(resolverInstruccionesUrl(covers, "roly", "Español")).toBe("https://x/roly-es.pdf");
  });

  it("cae automáticamente a Inglés para un idioma sin documento propio", () => {
    expect(resolverInstruccionesUrl(covers, "roly", "Portugués")).toBe("https://x/roly-en.pdf");
    expect(resolverInstruccionesUrl(covers, "roly", "Sueco")).toBe("https://x/roly-en.pdf");
  });

  it("sin idioma seleccionado no devuelve nada", () => {
    expect(resolverInstruccionesUrl(covers, "roly", null)).toBeUndefined();
    expect(resolverInstruccionesUrl(covers, "roly", undefined)).toBeUndefined();
  });

  it("sin covers_instrucciones no devuelve nada, ni con el fallback", () => {
    expect(resolverInstruccionesUrl(null, "roly", "Alemán")).toBeUndefined();
    expect(resolverInstruccionesUrl(null, "roly", "Sueco")).toBeUndefined();
  });

  it("un idioma con documento propio pero sin PDF subido no hereda el de otro catálogo", () => {
    expect(resolverInstruccionesUrl(covers, "roly_wrk", "Español")).toBeUndefined();
  });
});
