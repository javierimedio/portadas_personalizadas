import { describe, expect, it } from "vitest";
import { extractMentionNames, perfilesMencionados, segmentarComentario } from "@/features/solicitudes/domain/comentarios";

describe("extractMentionNames", () => {
  it("sin menciones devuelve vacío", () => {
    expect(extractMentionNames("comentario normal")).toEqual([]);
  });

  it("extrae una mención de una palabra, sin el signo de puntuación siguiente", () => {
    expect(extractMentionNames("hola @Ana, revisa esto")).toEqual(["Ana"]);
    expect(extractMentionNames("cc @Luis")).toEqual(["Luis"]);
  });

  it("extrae varias menciones", () => {
    expect(extractMentionNames("@Ana y @Luis revisad")).toEqual(["Ana", "Luis"]);
  });
});

describe("perfilesMencionados", () => {
  const perfiles = [
    { nombre: "Ana García", email: "ana@gorfactory.es" },
    { nombre: "Luis Pérez", email: "luis@gorfactory.es" },
  ];

  it("encuentra el perfil cuyo nombre contiene la mención (coincidencia por subcadena)", () => {
    expect(perfilesMencionados("hola @Ana", perfiles)).toEqual([perfiles[0]]);
    expect(perfilesMencionados("hola @García", perfiles)).toEqual([perfiles[0]]);
  });

  it("sin menciones no encuentra nada", () => {
    expect(perfilesMencionados("sin arroba", perfiles)).toEqual([]);
  });
});

describe("segmentarComentario", () => {
  it("sin menciones, un único segmento de texto", () => {
    expect(segmentarComentario("hola mundo")).toEqual([{ texto: "hola mundo", mencion: false }]);
  });

  it("intercala texto y mención en orden", () => {
    expect(segmentarComentario("hola @Ana, gracias")).toEqual([
      { texto: "hola ", mencion: false },
      { texto: "@Ana", mencion: true },
      { texto: ", gracias", mencion: false },
    ]);
  });
});
