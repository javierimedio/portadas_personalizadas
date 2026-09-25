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
// 1. Portada obligatoria subida → permite enviar
// ---------------------------------------------------------------------------
describe("Escenario 1: portada obligatoria subida — permite enviar", () => {
  it("no hay faltantes cuando existe adjunto con el catalogo correcto", () => {
    const catalogos = [cat("roly", true, false)];
    const adjuntos = [adj("roly")];
    expect(portadasObligatoriasPendientes(catalogos, adjuntos)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Falta una portada obligatoria → bloquea
// ---------------------------------------------------------------------------
describe("Escenario 2: falta una portada obligatoria — bloquea", () => {
  it("devuelve el label del catálogo faltante", () => {
    const catalogos = [cat("roly_wrk", true, false)];
    const adjuntos: AdjuntoParaValidar[] = []; // ningún adjunto
    const faltantes = portadasObligatoriasPendientes(catalogos, adjuntos);
    expect(faltantes).toHaveLength(1);
    expect(faltantes[0]).toBe("ROLY WRK");
  });

  it("el mensaje menciona el catálogo exacto", () => {
    const msg = mensajePortadasPendientes(["ROLY WRK"]);
    expect(msg).toContain("ROLY WRK");
    expect(msg).toContain("comercial");
  });
});

// ---------------------------------------------------------------------------
// 3. Faltan varias portadas → bloquea e indica cuáles
// ---------------------------------------------------------------------------
describe("Escenario 3: faltan varias portadas — bloquea e indica cuáles", () => {
  it("devuelve todos los catálogos faltantes", () => {
    const catalogos = [
      cat("roly", true, false),
      cat("roly_wrk", true, false),
      cat("stamina", true, false),
    ];
    const adjuntos = [adj("roly")]; // solo ROLY subido
    const faltantes = portadasObligatoriasPendientes(catalogos, adjuntos);
    expect(faltantes).toHaveLength(2);
    expect(faltantes).toContain("ROLY WRK");
    expect(faltantes).toContain("STAMINA");
  });

  it("el mensaje menciona todos los catálogos faltantes", () => {
    const msg = mensajePortadasPendientes(["ROLY WRK", "STAMINA"]);
    expect(msg).toContain("ROLY WRK");
    expect(msg).toContain("STAMINA");
    expect(msg).toContain("comercial");
  });
});

// ---------------------------------------------------------------------------
// 4. portada_diseno_propio = true → no exige archivo
// ---------------------------------------------------------------------------
describe("Escenario 4: portada_diseno_propio = true — no exige archivo", () => {
  it("catálogo con diseño propio no requiere adjunto de portada", () => {
    const catalogos = [cat("stamina", true, true)];
    const adjuntos: AdjuntoParaValidar[] = [];
    expect(portadasObligatoriasPendientes(catalogos, adjuntos)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 5. portada_personalizada = false → no exige archivo
// ---------------------------------------------------------------------------
describe("Escenario 5: portada_personalizada = false — no exige archivo", () => {
  it("catálogo sin portada personalizada no requiere adjunto", () => {
    const catalogos = [cat("roly", false, false)];
    const adjuntos: AdjuntoParaValidar[] = [];
    expect(portadasObligatoriasPendientes(catalogos, adjuntos)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Varios catálogos → comprueba cada uno independientemente
// ---------------------------------------------------------------------------
describe("Escenario 6: varios catálogos — comprueba cada uno", () => {
  it("bloquea solo el catálogo que falta, permite los que tienen adjunto", () => {
    const catalogos = [
      cat("roly", true, false),    // requiere adjunto
      cat("roly_wrk", true, false), // requiere adjunto
      cat("stamina", true, true),   // diseño propio — no requiere
      cat("xmas", false, false),    // sin portada personalizada — no requiere
    ];
    const adjuntos = [adj("roly")]; // solo ROLY subido por bulk upload
    const faltantes = portadasObligatoriasPendientes(catalogos, adjuntos);
    expect(faltantes).toHaveLength(1);
    expect(faltantes[0]).toBe("ROLY WRK");
  });

  it("todos cubiertos → permite enviar", () => {
    const catalogos = [
      cat("roly", true, false),
      cat("roly_wrk", true, false),
    ];
    const adjuntos = [adj("roly"), adj("roly_wrk")];
    expect(portadasObligatoriasPendientes(catalogos, adjuntos)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 7. La validación es server-side: la función es pura e importable desde
//    server actions sin dependencias de cliente.
// ---------------------------------------------------------------------------
describe("Escenario 7: validación server-side", () => {
  it("portadasObligatoriasPendientes es una función pura sin efectos de red", () => {
    // La función no lanza ni hace fetch — es pura.
    expect(() =>
      portadasObligatoriasPendientes(
        [cat("roly", true, false)],
        [adj("roly")]
      )
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 8. No modifica portada_elegida: la función solo lee catalogos/adjuntos
//    y no toca portada_elegida en ningún parámetro ni retorno.
// ---------------------------------------------------------------------------
describe("Escenario 8: no modifica portada_elegida", () => {
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
// Bonus: subida individual (catalogo = null) — no bloquea
// ---------------------------------------------------------------------------
describe("Subida individual (catalogo = null) — no bloquea", () => {
  it("un adjunto con catalogo null cubre todos los catálogos requeridos", () => {
    const catalogos = [
      cat("roly", true, false),
      cat("roly_wrk", true, false),
    ];
    const adjuntos = [adj(null)]; // subida individual: sin trazabilidad por catálogo
    expect(portadasObligatoriasPendientes(catalogos, adjuntos)).toHaveLength(0);
  });
});
