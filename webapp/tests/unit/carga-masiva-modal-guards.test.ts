import { describe, expect, it } from "vitest";
import { canRemoveEntry, debeEliminarStorage } from "@/features/diseno/ui/carga-masiva-modal";

// Invariante P23: mientras procesarCargaMasiva() está en vuelo (procesando === true),
// NINGÚN archivo puede eliminarse del cliente via borrarArchivoSubido().
// Causa raíz: el botón ✕ permanecía activo durante el procesamiento y permitía
// borrar de Storage el archivo nuevo antes de que el Server Action commitara en BD.

describe("canRemoveEntry — botón ✕ deshabilitado durante procesando", () => {
  // Test 1: durante procesando, canRemove es false para cualquier archivo pendiente
  it("procesando=true bloquea el botón ✕ aunque el archivo esté en estado ok", () => {
    expect(canRemoveEntry(true, "ok")).toBe(false);
    expect(canRemoveEntry(true, "error")).toBe(false);
    expect(canRemoveEntry(true, "subiendo")).toBe(false);
    expect(canRemoveEntry(true, "procesado_error")).toBe(false);
  });

  // Test 3: cuando no está procesando, un archivo ok puede eliminarse
  it("procesando=false permite eliminar archivos no procesados", () => {
    expect(canRemoveEntry(false, "ok")).toBe(true);
    expect(canRemoveEntry(false, "error")).toBe(true);
    expect(canRemoveEntry(false, "subiendo")).toBe(true);
    expect(canRemoveEntry(false, "procesado_error")).toBe(true);
  });

  // Test 4: procesado_ok nunca puede eliminarse, sin importar procesando
  it("procesado_ok no puede eliminarse aunque procesando=false", () => {
    expect(canRemoveEntry(false, "procesado_ok")).toBe(false);
    expect(canRemoveEntry(true, "procesado_ok")).toBe(false);
  });
});

describe("debeEliminarStorage — borrarArchivoSubido no se invoca durante procesando", () => {
  // Test 2: durante procesando, no se debe llamar a borrarArchivoSubido
  it("procesando=true impide eliminar Storage aunque el archivo tenga meta", () => {
    expect(debeEliminarStorage(true, "ok", true)).toBe(false);
    expect(debeEliminarStorage(true, "ok", false)).toBe(false);
  });

  // Test 3 (complemento): fuera de procesando, archivo ok con meta sí se elimina
  it("procesando=false con estado ok y meta sí elimina Storage", () => {
    expect(debeEliminarStorage(false, "ok", true)).toBe(true);
  });

  it("procesando=false sin meta no elimina Storage", () => {
    expect(debeEliminarStorage(false, "ok", false)).toBe(false);
  });

  it("procesado_ok nunca elimina Storage", () => {
    expect(debeEliminarStorage(false, "procesado_ok", true)).toBe(false);
    expect(debeEliminarStorage(true, "procesado_ok", true)).toBe(false);
  });

  // Test 5: flujo de procesamiento completo — tras procesar, el archivo queda
  // en procesado_ok y ni el botón ✕ ni borrarArchivoSubido pueden activarse
  it("ciclo ok→procesando→procesado_ok: ninguna eliminación posible durante o después", () => {
    // Antes de procesar
    expect(canRemoveEntry(false, "ok")).toBe(true);
    expect(debeEliminarStorage(false, "ok", true)).toBe(true);

    // Durante procesado (procesando=true)
    expect(canRemoveEntry(true, "ok")).toBe(false);
    expect(debeEliminarStorage(true, "ok", true)).toBe(false);

    // Después de procesar con éxito (procesado_ok, procesando=false de nuevo)
    expect(canRemoveEntry(false, "procesado_ok")).toBe(false);
    expect(debeEliminarStorage(false, "procesado_ok", true)).toBe(false);

    // Archivos con error de procesamiento pueden reintentarse (✕ disponible)
    expect(canRemoveEntry(false, "procesado_error")).toBe(true);
  });
});
