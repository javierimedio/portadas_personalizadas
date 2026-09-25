import { describe, expect, it } from "vitest";
import { encontrarDisenoAReemplazar, type AdjuntoDisenado } from "@/features/solicitudes/domain/diseno-reemplazo";

// INVARIANTE: el reemplazo afecta solo al adjunto/diseño.
// portada_elegida, portada_opcion_*, algoritmo de auto-adjudicación y
// la validación de portadas obligatorias nunca se modifican aquí.

function adj(overrides: Partial<AdjuntoDisenado> = {}): AdjuntoDisenado {
  return {
    id: "adj-1",
    solicitud_id: "sol-1",
    catalogo: "roly_wrk",
    nombre: "20037_wrk.pdf",
    tipo: "diseno_portada",
    storage_path: "diseno/carga-masiva/20037_wrk.pdf",
    url: "https://host/storage/v1/object/public/bucket/diseno/carga-masiva/20037_wrk.pdf",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Archivo nuevo — no existe adjunto previo
// ---------------------------------------------------------------------------
describe("1. Archivo nuevo — no existe adjunto previo", () => {
  it("devuelve null cuando no hay ningún adjunto existente", () => {
    expect(
      encontrarDisenoAReemplazar([], { solicitud_id: "sol-1", catalogo: "roly_wrk", nombre: "20037_wrk.pdf" })
    ).toBeNull();
  });

  it("devuelve null cuando existen adjuntos de otro catálogo", () => {
    const existentes = [adj({ catalogo: "roly" })];
    expect(
      encontrarDisenoAReemplazar(existentes, { solicitud_id: "sol-1", catalogo: "roly_wrk", nombre: "20037_wrk.pdf" })
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. Mismo nombre + mismo catálogo + misma solicitud → reemplaza
// ---------------------------------------------------------------------------
describe("2. Mismo nombre + catálogo + solicitud — reemplaza", () => {
  it("devuelve el adjunto existente cuando coincide la identidad completa", () => {
    const existentes = [adj()];
    const result = encontrarDisenoAReemplazar(existentes, { solicitud_id: "sol-1", catalogo: "roly_wrk", nombre: "20037_wrk.pdf" });
    expect(result).not.toBeNull();
    expect(result!.id).toBe("adj-1");
    expect(result!.storage_path).toBe("diseno/carga-masiva/20037_wrk.pdf");
  });

  it("devuelve el adjunto correcto cuando hay varios adjuntos para la misma solicitud", () => {
    const existentes = [
      adj({ id: "adj-roly", catalogo: "roly", nombre: "20037_roly.pdf" }),
      adj({ id: "adj-wrk", catalogo: "roly_wrk", nombre: "20037_wrk.pdf" }),
      adj({ id: "adj-stm", catalogo: "stamina", nombre: "20037_stm.pdf" }),
    ];
    const result = encontrarDisenoAReemplazar(existentes, { solicitud_id: "sol-1", catalogo: "roly_wrk", nombre: "20037_wrk.pdf" });
    expect(result!.id).toBe("adj-wrk");
    // Los otros dos permanecen intactos
  });
});

// ---------------------------------------------------------------------------
// 3. Mismo nombre + catálogo diferente → NO reemplaza
// ---------------------------------------------------------------------------
describe("3. Mismo nombre + catálogo diferente — no reemplaza", () => {
  it("devuelve null cuando el catálogo no coincide", () => {
    const existentes = [adj({ catalogo: "roly" })]; // roly, no roly_wrk
    expect(
      encontrarDisenoAReemplazar(existentes, { solicitud_id: "sol-1", catalogo: "roly_wrk", nombre: "20037_wrk.pdf" })
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. Mismo nombre + solicitud diferente → NO reemplaza
// ---------------------------------------------------------------------------
describe("4. Mismo nombre + solicitud diferente — no reemplaza", () => {
  it("devuelve null cuando el solicitud_id no coincide", () => {
    const existentes = [adj({ solicitud_id: "sol-2" })];
    expect(
      encontrarDisenoAReemplazar(existentes, { solicitud_id: "sol-1", catalogo: "roly_wrk", nombre: "20037_wrk.pdf" })
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. Nuevo archivo falla → conservar el anterior
//    (invariante de la action: el adjunto existente no se toca si el update lanza)
// ---------------------------------------------------------------------------
describe("5. Fallo en nuevo archivo — conserva el anterior", () => {
  it("encontrarDisenoAReemplazar devuelve el adjunto existente sin modificarlo", () => {
    // La action debe: primero encontrar el existente, intentar el update,
    // y si el update falla, el registro original sigue en BD tal cual.
    // Este test verifica que el helper retorna el adjunto para que la action
    // pueda decidir si proceder o abortar.
    const existentes = [adj({ id: "adj-original", storage_path: "path/original.pdf" })];
    const result = encontrarDisenoAReemplazar(existentes, { solicitud_id: "sol-1", catalogo: "roly_wrk", nombre: "20037_wrk.pdf" });
    expect(result!.id).toBe("adj-original");
    expect(result!.storage_path).toBe("path/original.pdf");
    // La action solo elimina old storage DESPUÉS de que el update tenga éxito
  });
});

// ---------------------------------------------------------------------------
// 6. Bulk — reemplaza correctamente el archivo coincidente, no toca los demás
// ---------------------------------------------------------------------------
describe("6. Bulk — reemplaza solo el archivo coincidente", () => {
  it("identifica solo el adjunto que coincide en un batch de tres", () => {
    const existentes = [
      adj({ id: "adj-roly", catalogo: "roly", nombre: "20037_roly.pdf" }),
      adj({ id: "adj-wrk", catalogo: "roly_wrk", nombre: "20037_wrk.pdf" }),
      adj({ id: "adj-stm", catalogo: "stamina", nombre: "20037_stm.pdf" }),
    ];
    // Solo el wrk se reemplaza
    const wrk = encontrarDisenoAReemplazar(existentes, { solicitud_id: "sol-1", catalogo: "roly_wrk", nombre: "20037_wrk.pdf" });
    const roly = encontrarDisenoAReemplazar(existentes, { solicitud_id: "sol-1", catalogo: "roly", nombre: "20037_roly_nuevo.pdf" });
    expect(wrk!.id).toBe("adj-wrk");
    expect(roly).toBeNull(); // nombre diferente → no reemplaza
  });
});

// ---------------------------------------------------------------------------
// 7. Bulk con reemplazo fallido conserva el anterior — igual que caso 5
// ---------------------------------------------------------------------------
describe("7. Bulk + fallo — conserva el anterior", () => {
  it("el resultado de encontrarDisenoAReemplazar no muta el adjunto existente", () => {
    const existente = adj({ id: "adj-wrk", nombre: "20037_wrk.pdf" });
    const resultado = encontrarDisenoAReemplazar([existente], { solicitud_id: "sol-1", catalogo: "roly_wrk", nombre: "20037_wrk.pdf" });
    // El objeto original no se ha modificado (el helper es puro)
    expect(existente.id).toBe("adj-wrk");
    expect(resultado).toBe(existente); // misma referencia — no hay copia modificada
  });
});

// ---------------------------------------------------------------------------
// 8. No se generan duplicados — la identidad es exacta
// ---------------------------------------------------------------------------
describe("8. No se generan duplicados", () => {
  it("mismo nombre exacto → encontrado (actualizar, no insertar)", () => {
    const existentes = [adj()];
    expect(encontrarDisenoAReemplazar(existentes, { solicitud_id: "sol-1", catalogo: "roly_wrk", nombre: "20037_wrk.pdf" })).not.toBeNull();
  });

  it("extensión diferente → no encontrado (insertar, no duplicar)", () => {
    // "20037_wrk.pdf" y "20037_wrk.ai" son identidades distintas
    const existentes = [adj({ nombre: "20037_wrk.pdf" })];
    expect(
      encontrarDisenoAReemplazar(existentes, { solicitud_id: "sol-1", catalogo: "roly_wrk", nombre: "20037_wrk.ai" })
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 9. portada_elegida no cambia — el helper no la expone ni la modifica
// ---------------------------------------------------------------------------
describe("9. portada_elegida no se modifica", () => {
  it("AdjuntoDisenado no incluye portada_elegida", () => {
    const a = adj();
    expect(a).not.toHaveProperty("portada_elegida");
  });

  it("encontrarDisenoAReemplazar no devuelve portada_elegida", () => {
    const result = encontrarDisenoAReemplazar([adj()], { solicitud_id: "sol-1", catalogo: "roly_wrk", nombre: "20037_wrk.pdf" });
    expect(result).not.toHaveProperty("portada_elegida");
  });
});

// ---------------------------------------------------------------------------
// 10. Storage anterior se elimina — el helper expone storage_path y url
// ---------------------------------------------------------------------------
describe("10. Storage anterior accesible para eliminación", () => {
  it("el resultado expone storage_path para que la action limpie el archivo antiguo", () => {
    const existentes = [adj({ storage_path: "diseno/old/20037_wrk.pdf" })];
    const result = encontrarDisenoAReemplazar(existentes, { solicitud_id: "sol-1", catalogo: "roly_wrk", nombre: "20037_wrk.pdf" });
    expect(result!.storage_path).toBe("diseno/old/20037_wrk.pdf");
  });

  it("si storage_path es null, expone url para derivarlo", () => {
    const existentes = [adj({ storage_path: null, url: "https://host/storage/v1/object/public/bucket/old.pdf" })];
    const result = encontrarDisenoAReemplazar(existentes, { solicitud_id: "sol-1", catalogo: "roly_wrk", nombre: "20037_wrk.pdf" });
    expect(result!.storage_path).toBeNull();
    expect(result!.url).toContain("old.pdf");
    // La action usa storagePathDesdeUrl(result.url) como fallback
  });
});

// ---------------------------------------------------------------------------
// 11. Reintento de f783bc0 funciona con reemplazo — mismo nombre → reemplaza
// ---------------------------------------------------------------------------
describe("11. Reintento (f783bc0) + reemplazo", () => {
  it("un reintento con el mismo nombre del archivo detecta el adjunto a reemplazar", () => {
    // El usuario subió "20037_wrk.pdf" → procesado_error en la UI.
    // Reintenta con un nuevo archivo guardado también como "20037_wrk.pdf".
    // Si el intento anterior llegó a insertar en BD (poco probable en error de
    // match, pero posible en error de red tras insert), el helper lo detecta.
    const existentes = [adj({ id: "adj-primer-intento" })];
    const result = encontrarDisenoAReemplazar(existentes, { solicitud_id: "sol-1", catalogo: "roly_wrk", nombre: "20037_wrk.pdf" });
    expect(result!.id).toBe("adj-primer-intento");
    // La action reemplazará en vez de insertar → no hay duplicado
  });

  it("un reintento con nombre diferente no reemplaza el diseño anterior válido", () => {
    const existentes = [adj({ nombre: "20037_wrk.pdf" })];
    // Usuario reintenta con archivo renombrado
    const result = encontrarDisenoAReemplazar(existentes, { solicitud_id: "sol-1", catalogo: "roly_wrk", nombre: "20037_wrk_v2.pdf" });
    expect(result).toBeNull(); // no reemplaza — nombre diferente
  });
});
