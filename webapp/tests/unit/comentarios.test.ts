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

describe("perfilesMencionados — resolución exacta por nombre completo", () => {
  const marta1 = { nombre: "Marta Saura Pastor", email: "marketing20@gorfactory.es" };
  const marta2 = { nombre: "Marta Bracalante", email: "export18@gorfactory.es" };
  const ana = { nombre: "Ana García", email: "ana@gorfactory.es" };
  const luis = { nombre: "Luis Pérez", email: "luis@gorfactory.es" };
  const concha = { nombre: "Concepción Martínez", email: "concha@gorfactory.es" };

  it("@NombreCompleto solo coincide con ese perfil exacto (caso de la incidencia)", () => {
    const result = perfilesMencionados("hola @Marta Saura Pastor, mira esto", [marta1, marta2]);
    expect(result).toEqual([marta1]);
  });

  it("@Marta Saura Pastor NO incluye a Marta Bracalante", () => {
    const result = perfilesMencionados("@Marta Saura Pastor revisa el archivo", [marta1, marta2]);
    expect(result).toContainEqual(marta1);
    expect(result).not.toContainEqual(marta2);
  });

  it("sin menciones no encuentra nada", () => {
    expect(perfilesMencionados("sin arroba", [marta1, marta2])).toEqual([]);
  });

  it("mención al final de cadena sin delimitador posterior", () => {
    expect(perfilesMencionados("@Marta Saura Pastor", [marta1, marta2])).toEqual([marta1]);
  });

  it("varias menciones en el mismo comentario — solo las exactas", () => {
    const result = perfilesMencionados(
      "@Marta Saura Pastor y @Luis Pérez revisad esto",
      [marta1, marta2, ana, luis]
    );
    expect(result).toContainEqual(marta1);
    expect(result).toContainEqual(luis);
    expect(result).not.toContainEqual(marta2);
    expect(result).not.toContainEqual(ana);
  });

  it("mención con caracteres españoles en el nombre", () => {
    const result = perfilesMencionados("cc @Concepción Martínez para tu info", [concha, ana]);
    expect(result).toEqual([concha]);
  });

  it("nombre más largo/específico gana sobre prefijo más corto", () => {
    const short = { nombre: "Marta Saura", email: "marta.s@gorfactory.es" };
    // Texto menciona el nombre largo → coincide el largo, no el corto
    expect(perfilesMencionados("@Marta Saura Pastor", [marta1, short])).toEqual([marta1]);
    // Texto menciona el nombre corto → coincide el corto, no el largo
    expect(perfilesMencionados("@Marta Saura,", [marta1, short])).toEqual([short]);
  });

  it("no genera falso positivo con un prefijo parcial igual (@Marta solo no coincide)", () => {
    // "@Marta" sin apellidos no basta para coincidir con ningún perfil de nombre completo
    expect(perfilesMencionados("@Marta revisa", [marta1, marta2])).toEqual([]);
  });

  it("perfil inactivo: si addComentario lo excluye de la lista, nunca es destinatario", () => {
    // addComentario filtra .eq("activo", true) antes de llamar a perfilesMencionados,
    // así que los perfiles inactivos no forman parte de la lista recibida.
    // Si solo pasan los activos, la mención al inactivo no produce ninguna coincidencia.
    const inactivo = { nombre: "Marta Bracalante", email: "export18@gorfactory.es" };
    const soloActivos = [marta1]; // inactivo excluido por la query
    expect(perfilesMencionados("@Marta Bracalante hola", soloActivos)).toEqual([]);
  });

  it("dos perfiles con nombre idéntico — solo se devuelve una entrada", () => {
    const duplicado = { nombre: "Marta Saura Pastor", email: "otro@gorfactory.es" };
    const result = perfilesMencionados("@Marta Saura Pastor", [marta1, duplicado]);
    expect(result).toHaveLength(1);
  });

  it("mención por email completo también coincide", () => {
    const result = perfilesMencionados("avisa a @marketing20@gorfactory.es por favor", [marta1, marta2]);
    expect(result).toContainEqual(marta1);
    expect(result).not.toContainEqual(marta2);
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
