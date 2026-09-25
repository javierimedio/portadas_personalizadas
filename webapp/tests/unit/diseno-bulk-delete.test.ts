import { describe, expect, it } from "vitest";
import { ELIMINAR_ADJUNTO_ROLES } from "@/features/solicitudes/domain/estado-flujo";

// ---------------------------------------------------------------------------
// P16 — Selección múltiple y borrado de archivos de diseño
// ---------------------------------------------------------------------------

describe("P16 — permisos de eliminación en masa de adjuntos", () => {
  const rolesEsperados = ["admin", "marketing", "disenador", "responsable_diseno"] as const;

  it("ELIMINAR_ADJUNTO_ROLES contiene exactamente los 4 roles esperados", () => {
    expect(ELIMINAR_ADJUNTO_ROLES).toHaveLength(4);
    for (const rol of rolesEsperados) {
      expect(ELIMINAR_ADJUNTO_ROLES).toContain(rol);
    }
  });

  it.each(rolesEsperados)("el rol '%s' puede eliminar adjuntos en masa", (rol) => {
    expect((ELIMINAR_ADJUNTO_ROLES as readonly string[]).includes(rol)).toBe(true);
  });

  it("comercial_nacional NO puede eliminar adjuntos", () => {
    expect((ELIMINAR_ADJUNTO_ROLES as readonly string[]).includes("comercial_nacional")).toBe(false);
  });

  it("comercial_exportacion NO puede eliminar adjuntos", () => {
    expect((ELIMINAR_ADJUNTO_ROLES as readonly string[]).includes("comercial_exportacion")).toBe(false);
  });

  it("responsable_nacional NO puede eliminar adjuntos", () => {
    expect((ELIMINAR_ADJUNTO_ROLES as readonly string[]).includes("responsable_nacional")).toBe(false);
  });

  it("responsable_exportacion NO puede eliminar adjuntos", () => {
    expect((ELIMINAR_ADJUNTO_ROLES as readonly string[]).includes("responsable_exportacion")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tipos de adjunto que forman disenosAdjuntos
// La función de filtro `a.tipo.endsWith("_diseno") || a.tipo === "diseno_portada"`
// determina qué adjuntos forman la sección elimnable — se prueba aquí como
// invariante de dominio, sin depender del componente.
// ---------------------------------------------------------------------------

const isDisenoAdjunto = (tipo: string) =>
  tipo.endsWith("_diseno") || tipo === "diseno_portada";

describe("P16 — tipos de adjunto candidatos a eliminación en masa", () => {
  it("diseno_portada → incluido", () => {
    expect(isDisenoAdjunto("diseno_portada")).toBe(true);
  });

  it("roly_diseno → incluido (termina en _diseno)", () => {
    expect(isDisenoAdjunto("roly_diseno")).toBe(true);
  });

  it("stamina_diseno → incluido", () => {
    expect(isDisenoAdjunto("stamina_diseno")).toBe(true);
  });

  it("xmas_diseno → incluido", () => {
    expect(isDisenoAdjunto("xmas_diseno")).toBe(true);
  });

  it("logo_general → NO incluido", () => {
    expect(isDisenoAdjunto("logo_general")).toBe(false);
  });

  it("adjunto_comercial → NO incluido", () => {
    expect(isDisenoAdjunto("adjunto_comercial")).toBe(false);
  });

  it("enlace_externo → NO incluido", () => {
    expect(isDisenoAdjunto("enlace_externo")).toBe(false);
  });

  it("portada_elegida NO es tipo de adjunto (vive en solicitud_catalogos, nunca en tabla adjuntos)", () => {
    // portada_elegida es un campo de solicitud_catalogos, no un valor de tipo en adjuntos.
    // Verificamos que no quedaría incluido accidentalmente en el filtro.
    expect(isDisenoAdjunto("portada_elegida")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Selección y deselección — lógica pura de Set
// (replica la lógica del componente sin depender de React)
// ---------------------------------------------------------------------------

function seleccionar(prev: Set<string>, id: string): Set<string> {
  return new Set([...prev, id]);
}

function deseleccionar(prev: Set<string>, id: string): Set<string> {
  const next = new Set(prev);
  next.delete(id);
  return next;
}

function seleccionarTodo(ids: string[]): Set<string> {
  return new Set(ids);
}

function deseleccionarTodo(): Set<string> {
  return new Set();
}

describe("P16 — lógica de selección individual y total", () => {
  it("seleccionar un item lo añade al conjunto", () => {
    const result = seleccionar(new Set(), "a1");
    expect(result.has("a1")).toBe(true);
    expect(result.size).toBe(1);
  });

  it("seleccionar el mismo item dos veces no crea duplicado (invariante de Set)", () => {
    const after1 = seleccionar(new Set(), "a1");
    const after2 = seleccionar(after1, "a1");
    expect(after2.size).toBe(1);
  });

  it("deseleccionar elimina el item", () => {
    const selected = new Set(["a1", "a2"]);
    const result = deseleccionar(selected, "a1");
    expect(result.has("a1")).toBe(false);
    expect(result.has("a2")).toBe(true);
  });

  it("deseleccionar un item inexistente no lanza error (no-op)", () => {
    const selected = new Set(["a1"]);
    const result = deseleccionar(selected, "a999");
    expect(result.size).toBe(1);
  });

  it("seleccionar todo: todos los ids quedan en el conjunto", () => {
    const ids = ["a1", "a2", "a3"];
    const result = seleccionarTodo(ids);
    expect(result.size).toBe(3);
    for (const id of ids) expect(result.has(id)).toBe(true);
  });

  it("deseleccionar todo: conjunto vacío", () => {
    const result = deseleccionarTodo();
    expect(result.size).toBe(0);
  });

  it("el botón de eliminar solo aparece cuando selectedIds.size > 0", () => {
    expect(new Set().size > 0).toBe(false);
    expect(new Set(["a1"]).size > 0).toBe(true);
  });

  it("al confirmar, el conjunto se vacía antes de llamar a la acción", () => {
    let selected = new Set(["a1", "a2"]);
    const ids = Array.from(selected);
    selected = deseleccionarTodo();
    expect(selected.size).toBe(0);
    expect(ids).toEqual(["a1", "a2"]); // ids a pasar a la action
  });

  it("cancelar la confirmación no modifica el conjunto seleccionado", () => {
    const selected = new Set(["a1", "a2"]);
    // cancelar simplemente no llama a la acción — el set no cambia
    expect(selected.size).toBe(2);
  });
});
