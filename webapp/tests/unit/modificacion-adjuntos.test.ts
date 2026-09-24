import { describe, expect, it } from "vitest";
import {
  agregarEntradas,
  marcarOk,
  marcarError,
  quitarEntrada,
  adjuntosParaEnviar,
  archivosParaLimpiar,
  buildAdjuntosTexto,
  type ModifEntry,
} from "@/features/solicitudes/domain/modificacion-adjuntos";
import type { UploadedFile } from "@/shared/storage/types";

function makeEntry(partial: Partial<ModifEntry> & { id: string }): ModifEntry {
  return { nombre: "archivo.pdf", size: 1024, estado: "subiendo", ...partial };
}

function makeUploaded(partial: Partial<UploadedFile> = {}): UploadedFile {
  return {
    path: "solicitudes/abc/modificaciones/file.pdf",
    url: "https://example.com/file.pdf",
    nombre: "file.pdf",
    tipo: "application/pdf",
    size: 1024,
    ...partial,
  };
}

// ---------------------------------------------------------------------------
// agregarEntradas
// ---------------------------------------------------------------------------
describe("agregarEntradas — acumulación", () => {
  it("acumula 1 archivo en lista vacía", () => {
    const result = agregarEntradas([], [{ id: "1", nombre: "a.pdf", size: 100 }]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "1", nombre: "a.pdf", estado: "subiendo" });
  });

  it("acumula múltiples archivos en una sola llamada (drag & drop múltiple)", () => {
    const result = agregarEntradas([], [
      { id: "1", nombre: "a.pdf", size: 100 },
      { id: "2", nombre: "b.pdf", size: 200 },
      { id: "3", nombre: "c.pdf", size: 300 },
    ]);
    expect(result).toHaveLength(3);
    expect(result.map((e) => e.id)).toEqual(["1", "2", "3"]);
  });

  it("acumula archivos en llamadas consecutivas (varias tandas de selección)", () => {
    const after1 = agregarEntradas([], [{ id: "1", nombre: "a.pdf", size: 100 }]);
    const after2 = agregarEntradas(after1, [{ id: "2", nombre: "b.pdf", size: 200 }]);
    const after3 = agregarEntradas(after2, [{ id: "3", nombre: "c.pdf", size: 300 }]);
    expect(after3).toHaveLength(3);
    expect(after3.map((e) => e.id)).toEqual(["1", "2", "3"]);
  });

  it("NO sustituye archivos anteriores — todos los acumulados permanecen", () => {
    const prev = [makeEntry({ id: "1", estado: "ok", meta: makeUploaded() })];
    const result = agregarEntradas(prev, [{ id: "2", nombre: "b.pdf", size: 50 }]);
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe("1");
    expect(result[1]!.id).toBe("2");
  });

  it("array vacío devuelve el previo sin cambios", () => {
    const prev = [makeEntry({ id: "1" })];
    expect(agregarEntradas(prev, [])).toEqual(prev);
  });
});

// ---------------------------------------------------------------------------
// marcarOk / marcarError
// ---------------------------------------------------------------------------
describe("marcarOk / marcarError — transiciones de estado individuales", () => {
  it("marcarOk actualiza solo la entrada correcta", () => {
    const meta = makeUploaded();
    const prev = [makeEntry({ id: "1" }), makeEntry({ id: "2" })];
    const result = marcarOk(prev, "1", meta);
    expect(result[0]!).toMatchObject({ id: "1", estado: "ok", meta });
    expect(result[1]!).toMatchObject({ id: "2", estado: "subiendo" });
  });

  it("marcarError actualiza solo la entrada correcta", () => {
    const prev = [makeEntry({ id: "1" }), makeEntry({ id: "2" })];
    const result = marcarError(prev, "2");
    expect(result[0]!.estado).toBe("subiendo");
    expect(result[1]!.estado).toBe("error");
  });
});

// ---------------------------------------------------------------------------
// quitarEntrada
// ---------------------------------------------------------------------------
describe("quitarEntrada — eliminación individual", () => {
  it("quita solo el archivo con el id indicado (A, B, C → quitar B → A, C)", () => {
    const prev = [makeEntry({ id: "A" }), makeEntry({ id: "B" }), makeEntry({ id: "C" })];
    const result = quitarEntrada(prev, "B");
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.id)).toEqual(["A", "C"]);
  });

  it("quitar el único archivo deja la lista vacía", () => {
    expect(quitarEntrada([makeEntry({ id: "1" })], "1")).toEqual([]);
  });

  it("id inexistente no modifica la lista", () => {
    const prev = [makeEntry({ id: "1" }), makeEntry({ id: "2" })];
    expect(quitarEntrada(prev, "99")).toHaveLength(2);
  });

  it("eliminar A de [A, B] y enviar solo deja B como adjunto", () => {
    const metaA = makeUploaded({ nombre: "a.pdf" });
    const metaB = makeUploaded({ nombre: "b.pdf" });
    const prev = [makeEntry({ id: "A", estado: "ok", meta: metaA }), makeEntry({ id: "B", estado: "ok", meta: metaB })];
    const afterRemove = quitarEntrada(prev, "A");
    const adjuntos = adjuntosParaEnviar(afterRemove);
    expect(adjuntos).toHaveLength(1);
    expect(adjuntos[0]).toBe(metaB);
  });
});

// ---------------------------------------------------------------------------
// adjuntosParaEnviar
// ---------------------------------------------------------------------------
describe("adjuntosParaEnviar — extracción de archivos confirmados para el server action", () => {
  it("lista vacía devuelve array vacío", () => {
    expect(adjuntosParaEnviar([])).toEqual([]);
  });

  it("1 archivo ok crea 1 fila en adjuntos (escenario A)", () => {
    const meta = makeUploaded({ nombre: "a.pdf" });
    const result = adjuntosParaEnviar([makeEntry({ id: "1", estado: "ok", meta })]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(meta);
  });

  it("3 archivos ok crean 3 filas en adjuntos (escenario B)", () => {
    const metas = [makeUploaded({ nombre: "a.pdf" }), makeUploaded({ nombre: "b.pdf" }), makeUploaded({ nombre: "c.pdf" })];
    const entries = metas.map((meta, i) => makeEntry({ id: String(i), estado: "ok", meta }));
    expect(adjuntosParaEnviar(entries)).toHaveLength(3);
  });

  it("excluye archivos en estado 'subiendo' y 'error' — validación individual", () => {
    const meta = makeUploaded();
    const entries = [
      makeEntry({ id: "1", estado: "subiendo" }),
      makeEntry({ id: "2", estado: "ok", meta }),
      makeEntry({ id: "3", estado: "error" }),
    ];
    const result = adjuntosParaEnviar(entries);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(meta);
  });

  it("devuelve los adjuntos en el orden de inserción", () => {
    const meta1 = makeUploaded({ nombre: "a.pdf" });
    const meta2 = makeUploaded({ nombre: "b.pdf" });
    const entries = [makeEntry({ id: "1", estado: "ok", meta: meta1 }), makeEntry({ id: "2", estado: "ok", meta: meta2 })];
    const result = adjuntosParaEnviar(entries);
    expect(result[0]).toBe(meta1);
    expect(result[1]).toBe(meta2);
  });
});

// ---------------------------------------------------------------------------
// archivosParaLimpiar
// ---------------------------------------------------------------------------
describe("archivosParaLimpiar — limpieza de temporales", () => {
  it("lista vacía devuelve array vacío", () => {
    expect(archivosParaLimpiar([])).toEqual([]);
  });

  it("devuelve paths solo de archivos ya subidos (con meta)", () => {
    const meta = makeUploaded({ path: "solicitudes/x/mod/file.pdf" });
    const entries = [
      makeEntry({ id: "1", estado: "subiendo" }),
      makeEntry({ id: "2", estado: "ok", meta }),
      makeEntry({ id: "3", estado: "error" }),
    ];
    expect(archivosParaLimpiar(entries)).toEqual(["solicitudes/x/mod/file.pdf"]);
  });

  it("devuelve múltiples paths cuando hay varios archivos subidos", () => {
    const m1 = makeUploaded({ path: "path/a" });
    const m2 = makeUploaded({ path: "path/b" });
    const entries = [makeEntry({ id: "1", estado: "ok", meta: m1 }), makeEntry({ id: "2", estado: "ok", meta: m2 })];
    expect(archivosParaLimpiar(entries)).toEqual(["path/a", "path/b"]);
  });

  it("opera solo sobre la lista temporal — los adjuntos existentes en BD no están en este array", () => {
    // Los adjuntos confirmados viven en la BD y nunca se añaden a archivosModificacion.
    // Este test verifica que el array es autocontenido: limpiar solo borra los temporales.
    const entries: ModifEntry[] = [makeEntry({ id: "tmp", estado: "ok", meta: makeUploaded({ path: "temp/path" }) })];
    const paths = archivosParaLimpiar(entries);
    expect(paths).toHaveLength(1);
    expect(paths[0]).toBe("temp/path");
  });
});

// ---------------------------------------------------------------------------
// buildAdjuntosTexto
// ---------------------------------------------------------------------------
describe("buildAdjuntosTexto — texto del log de actividad", () => {
  it("sin adjuntos devuelve el comentario sin modificar", () => {
    expect(buildAdjuntosTexto("Revisad el color", [])).toBe("Revisad el color");
  });

  it("1 adjunto añade la línea de enlace con formato correcto", () => {
    const adjuntos = [makeUploaded({ nombre: "ref.pdf", url: "https://x.com/ref.pdf" })];
    expect(buildAdjuntosTexto("Revisad el color", adjuntos)).toBe(
      "Revisad el color\n📎 Adjunto: [ref.pdf](https://x.com/ref.pdf)"
    );
  });

  it("múltiples adjuntos añaden una línea por cada uno", () => {
    const adjuntos = [
      makeUploaded({ nombre: "a.pdf", url: "https://x.com/a.pdf" }),
      makeUploaded({ nombre: "b.ai", url: "https://x.com/b.ai" }),
    ];
    const result = buildAdjuntosTexto("Cambiad el logo", adjuntos);
    const lineas = result.split("\n");
    expect(lineas).toHaveLength(3);
    expect(lineas[0]).toBe("Cambiad el logo");
    expect(lineas[1]).toBe("📎 Adjunto: [a.pdf](https://x.com/a.pdf)");
    expect(lineas[2]).toBe("📎 Adjunto: [b.ai](https://x.com/b.ai)");
  });

  it("comentario vacío con adjuntos solo muestra los enlaces", () => {
    const adjuntos = [makeUploaded({ nombre: "x.pdf", url: "https://x.com/x.pdf" })];
    const result = buildAdjuntosTexto("", adjuntos);
    expect(result).toBe("\n📎 Adjunto: [x.pdf](https://x.com/x.pdf)");
  });
});
