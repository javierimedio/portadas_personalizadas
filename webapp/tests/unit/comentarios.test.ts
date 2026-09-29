import { describe, expect, it } from "vitest";
import { extractMentionNames, perfilesMencionados, segmentarComentario, segmentarTextoCompleto } from "@/features/solicitudes/domain/comentarios";

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

describe("segmentarTextoCompleto — URLs en comentarios", () => {
  it("1. comentario sin URL → solo segmentos de texto", () => {
    const result = segmentarTextoCompleto("comentario normal sin URLs");
    expect(result).toEqual([{ tipo: "texto", texto: "comentario normal sin URLs" }]);
  });

  it("2. URL https:// → segmento tipo url", () => {
    const result = segmentarTextoCompleto("https://ejemplo.com");
    expect(result).toEqual([{ tipo: "url", texto: "https://ejemplo.com", href: "https://ejemplo.com" }]);
  });

  it("3. URL http:// → segmento tipo url", () => {
    const result = segmentarTextoCompleto("http://ejemplo.com");
    expect(result).toEqual([{ tipo: "url", texto: "http://ejemplo.com", href: "http://ejemplo.com" }]);
  });

  it("4. URL dentro de una frase → el texto anterior y posterior permanece intacto", () => {
    const result = segmentarTextoCompleto("Mira esto: https://ejemplo.com gracias");
    expect(result).toEqual([
      { tipo: "texto", texto: "Mira esto: " },
      { tipo: "url", texto: "https://ejemplo.com", href: "https://ejemplo.com" },
      { tipo: "texto", texto: " gracias" },
    ]);
  });

  it("5. varias URLs en el mismo comentario", () => {
    const result = segmentarTextoCompleto("a https://uno.com y https://dos.com fin");
    expect(result).toEqual([
      { tipo: "texto", texto: "a " },
      { tipo: "url", texto: "https://uno.com", href: "https://uno.com" },
      { tipo: "texto", texto: " y " },
      { tipo: "url", texto: "https://dos.com", href: "https://dos.com" },
      { tipo: "texto", texto: " fin" },
    ]);
  });

  it("6. saltos de línea: la función procesa cada línea correctamente de forma independiente", () => {
    // El componente divide por \n antes de llamar a segmentarTextoCompleto por línea.
    // Verificamos que cada línea produce los segmentos esperados.
    const linea1 = segmentarTextoCompleto("primera línea sin URL");
    const linea2 = segmentarTextoCompleto("segunda línea con https://ejemplo.com aquí");
    expect(linea1).toEqual([{ tipo: "texto", texto: "primera línea sin URL" }]);
    expect(linea2).toEqual([
      { tipo: "texto", texto: "segunda línea con " },
      { tipo: "url", texto: "https://ejemplo.com", href: "https://ejemplo.com" },
      { tipo: "texto", texto: " aquí" },
    ]);
  });

  it("7. puntuación inmediatamente tras la URL no forma parte del href", () => {
    const result = segmentarTextoCompleto("visita https://ejemplo.com.");
    const urlSeg = result.find((s) => s.tipo === "url");
    expect(urlSeg).toMatchObject({ tipo: "url", href: "https://ejemplo.com", texto: "https://ejemplo.com" });
    const puntSeg = result.find((s) => s.tipo === "texto" && s.texto === ".");
    expect(puntSeg).toBeDefined();
  });

  it("8. segmento url expone href separado para que el componente use target=_blank y rel=noopener", () => {
    // La función devuelve { tipo: "url", href } — el componente renderiza
    // <a href={href} target="_blank" rel="noopener noreferrer"> sin dangerouslySetInnerHTML.
    const result = segmentarTextoCompleto("enlace: https://ejemplo.com");
    const urlSeg = result.find((s) => s.tipo === "url");
    expect(urlSeg).toBeDefined();
    expect(urlSeg).toHaveProperty("href", "https://ejemplo.com");
    expect(urlSeg).toHaveProperty("texto", "https://ejemplo.com");
  });

  it("9. devuelve datos estructurados, no cadenas HTML (garantía contra dangerouslySetInnerHTML)", () => {
    // La función nunca produce HTML: devuelve objetos con tipo/texto/href.
    // Texto con caracteres especiales llega intacto como dato, no escapado.
    const result = segmentarTextoCompleto('ver <b>esto</b> en https://ejemplo.com/ruta?a=1&b=2');
    expect(result.every((s) => typeof s === "object" && "tipo" in s)).toBe(true);
    const urlSeg = result.find((s) => s.tipo === "url");
    expect(urlSeg).toMatchObject({ tipo: "url", href: "https://ejemplo.com/ruta?a=1&b=2" });
    // El texto previo llega sin escapar — es dato puro que React escapa al renderizar
    const textoSeg = result.find((s) => s.tipo === "texto");
    expect(textoSeg?.texto).toContain("<b>esto</b>");
  });
});
