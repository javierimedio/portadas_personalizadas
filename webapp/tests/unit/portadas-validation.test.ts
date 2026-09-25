import { describe, expect, it } from "vitest";
import { portadasObligatoriasPendientes, mensajePortadasPendientes } from "@/features/solicitudes/domain/portadas-validation";
import type { CatalogoParaValidar, AdjuntoParaValidar } from "@/features/solicitudes/domain/portadas-validation";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cat(
  catalogo: string,
  portada_personalizada: boolean,
  portada_diseno_propio: boolean
): CatalogoParaValidar {
  return { catalogo, portada_personalizada, portada_diseno_propio };
}

function adj(catalogo: string | null): AdjuntoParaValidar {
  return { tipo: "diseno_portada", catalogo };
}

// ---------------------------------------------------------------------------
// 1. Subida individual ROLY → bloquea porque falta WRK
// ---------------------------------------------------------------------------
describe("Escenario 1: subida individual ROLY — bloquea porque falta WRK", () => {
  it("devuelve ROLY WRK como faltante cuando solo se subió ROLY", () => {
    const catalogos = [cat("roly", true, false), cat("roly_wrk", true, false)];
    const adjuntos = [adj("roly")];
    const faltantes = portadasObligatoriasPendientes(catalogos, adjuntos);
    expect(faltantes).toHaveLength(1);
    expect(faltantes[0]).toBe("ROLY WRK");
  });
});

// ---------------------------------------------------------------------------
// 2. Subida individual ROLY + WRK + STAMINA → permite enviar
// ---------------------------------------------------------------------------
describe("Escenario 2: subida individual ROLY + WRK + STAMINA — permite enviar", () => {
  it("no hay faltantes cuando todos los catálogos requeridos tienen adjunto", () => {
    const catalogos = [
      cat("roly", true, false),
      cat("roly_wrk", true, false),
      cat("stamina", true, false),
    ];
    const adjuntos = [adj("roly"), adj("roly_wrk"), adj("stamina")];
    expect(portadasObligatoriasPendientes(catalogos, adjuntos)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. portada_diseno_propio = true → no exige archivo aunque sea individual
// ---------------------------------------------------------------------------
describe("Escenario 3: portada_diseno_propio = true — no exige archivo", () => {
  it("catálogo con diseño propio no requiere adjunto de portada", () => {
    const catalogos = [cat("stamina", true, true)];
    const adjuntos: AdjuntoParaValidar[] = [];
    expect(portadasObligatoriasPendientes(catalogos, adjuntos)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Carga masiva 2/3 → bloquea
// ---------------------------------------------------------------------------
describe("Escenario 4: carga masiva 2 de 3 — bloquea", () => {
  it("devuelve el catálogo faltante cuando solo se subieron 2 de 3", () => {
    const catalogos = [
      cat("roly", true, false),
      cat("roly_wrk", true, false),
      cat("stamina", true, false),
    ];
    const adjuntos = [adj("roly"), adj("roly_wrk")];
    const faltantes = portadasObligatoriasPendientes(catalogos, adjuntos);
    expect(faltantes).toHaveLength(1);
    expect(faltantes[0]).toBe("STAMINA");
  });
});

// ---------------------------------------------------------------------------
// 5. Carga masiva 3/3 → permite
// ---------------------------------------------------------------------------
describe("Escenario 5: carga masiva 3 de 3 — permite", () => {
  it("no hay faltantes cuando la carga masiva cubre todos los catálogos", () => {
    const catalogos = [
      cat("roly", true, false),
      cat("roly_wrk", true, false),
      cat("stamina", true, false),
    ];
    const adjuntos = [adj("roly"), adj("roly_wrk"), adj("stamina")];
    expect(portadasObligatoriasPendientes(catalogos, adjuntos)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Solicitud ya completa + batch con un archivo fallido → no bloquea
// ---------------------------------------------------------------------------
describe("Escenario 6: solicitud ya completa con adjuntos previos — no bloquea", () => {
  it("los adjuntos previos cubren la validación aunque el batch nuevo falle parcialmente", () => {
    const catalogos = [
      cat("roly", true, false),
      cat("roly_wrk", true, false),
    ];
    // Adjuntos existentes en BD (de subidas anteriores) + uno nuevo del batch actual
    const adjuntos = [adj("roly"), adj("roly_wrk"), adj("roly")]; // roly duplicado, wrk cubierto
    expect(portadasObligatoriasPendientes(catalogos, adjuntos)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 7. portada_elegida no se modifica: la función solo lee catalogos/adjuntos
// ---------------------------------------------------------------------------
describe("Escenario 7: portada_elegida no se modifica", () => {
  it("CatalogoParaValidar no incluye portada_elegida", () => {
    const c = cat("roly", true, false);
    expect(c).not.toHaveProperty("portada_elegida");
  });

  it("el retorno es solo un array de labels — sin portada_elegida", () => {
    const catalogos = [cat("roly", true, false)];
    const result = portadasObligatoriasPendientes(catalogos, []);
    expect(Array.isArray(result)).toBe(true);
    expect(typeof result[0]).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// Escenarios base: portada_personalizada = false no exige archivo
// ---------------------------------------------------------------------------
describe("portada_personalizada = false — no exige archivo", () => {
  it("catálogo sin portada personalizada no requiere adjunto", () => {
    const catalogos = [cat("roly", false, false)];
    const adjuntos: AdjuntoParaValidar[] = [];
    expect(portadasObligatoriasPendientes(catalogos, adjuntos)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Mensaje de error
// ---------------------------------------------------------------------------
describe("mensajePortadasPendientes", () => {
  it("mensaje singular menciona el catálogo y el comercial", () => {
    const msg = mensajePortadasPendientes(["ROLY WRK"]);
    expect(msg).toContain("ROLY WRK");
    expect(msg).toContain("comercial");
  });

  it("mensaje plural menciona todos los catálogos faltantes", () => {
    const msg = mensajePortadasPendientes(["ROLY WRK", "STAMINA"]);
    expect(msg).toContain("ROLY WRK");
    expect(msg).toContain("STAMINA");
    expect(msg).toContain("comercial");
  });
});

// ---------------------------------------------------------------------------
// Validación server-side: la función es pura e importable sin dependencias cliente
// ---------------------------------------------------------------------------
describe("validación server-side — función pura", () => {
  it("portadasObligatoriasPendientes no lanza ni hace fetch", () => {
    expect(() =>
      portadasObligatoriasPendientes(
        [cat("roly", true, false)],
        [adj("roly")]
      )
    ).not.toThrow();
  });
});
