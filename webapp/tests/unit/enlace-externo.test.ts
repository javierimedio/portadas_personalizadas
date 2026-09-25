import { describe, expect, it } from "vitest";
import {
  validarEnlace,
  puedeAgregarEnlace,
  puedeEliminarEnlace,
  esEnlaceExterno,
} from "@/features/solicitudes/domain/enlace-externo";

// ---------------------------------------------------------------------------
// validarEnlace — validación de URL y nombre
// ---------------------------------------------------------------------------
describe("validarEnlace — URL válidas por protocolo", () => {
  it("URL http válida no devuelve error", () => {
    expect(validarEnlace("Diseño de referencia", "http://example.com")).toBeNull();
  });

  it("URL https válida no devuelve error", () => {
    expect(validarEnlace("WeTransfer", "https://we.tl/xxxxxx")).toBeNull();
  });

  it("URL inválida (sin protocolo) devuelve error", () => {
    expect(validarEnlace("Ref", "no-es-una-url")).not.toBeNull();
  });

  it("javascript: rechazado", () => {
    expect(validarEnlace("Ref", "javascript:alert(1)")).not.toBeNull();
  });

  it("data: rechazado", () => {
    expect(validarEnlace("Ref", "data:text/html,<h1>hola</h1>")).not.toBeNull();
  });

  it("ftp: rechazado", () => {
    expect(validarEnlace("Ref", "ftp://files.example.com")).not.toBeNull();
  });

  it("vbscript: rechazado", () => {
    expect(validarEnlace("Ref", "vbscript:msgbox(1)")).not.toBeNull();
  });
});

describe("validarEnlace — longitud de URL", () => {
  it("URL exactamente 2000 caracteres es válida", () => {
    const url = "https://example.com/" + "a".repeat(2000 - "https://example.com/".length);
    expect(url.length).toBeLessThanOrEqual(2000);
    expect(validarEnlace("Ref", url)).toBeNull();
  });

  it("URL de 2001 caracteres es rechazada", () => {
    const url = "https://example.com/" + "a".repeat(1981);
    expect(url.length).toBe(2001);
    expect(validarEnlace("Ref", url)).not.toBeNull();
  });
});

describe("validarEnlace — nombre", () => {
  it("nombre vacío rechazado", () => {
    expect(validarEnlace("", "https://example.com")).not.toBeNull();
  });

  it("nombre solo espacios rechazado", () => {
    expect(validarEnlace("   ", "https://example.com")).not.toBeNull();
  });

  it("nombre exactamente 150 caracteres es válido", () => {
    const nombre = "a".repeat(150);
    expect(validarEnlace(nombre, "https://example.com")).toBeNull();
  });

  it("nombre de 151 caracteres rechazado", () => {
    const nombre = "a".repeat(151);
    expect(validarEnlace(nombre, "https://example.com")).not.toBeNull();
  });

  it("nombre con acentos y caracteres especiales es válido", () => {
    expect(validarEnlace("Diseño de portaña — referencia ñoño", "https://example.com")).toBeNull();
  });

  it("nombre con espacios es válido", () => {
    expect(validarEnlace("Diseño de referencia del cliente", "https://example.com")).toBeNull();
  });
});

describe("validarEnlace — casos de uso reales (crear enlace correctamente)", () => {
  it("WeTransfer link → sin error de validación", () => {
    expect(validarEnlace("Archivos WeTransfer", "https://we.tl/xxxxxx")).toBeNull();
  });

  it("Google Drive link → sin error de validación", () => {
    expect(validarEnlace("Google Drive — recursos", "https://drive.google.com/drive/folders/abc123")).toBeNull();
  });

  it("Dropbox link → sin error de validación", () => {
    expect(validarEnlace("Dropbox carpeta", "https://www.dropbox.com/sh/xxxxx")).toBeNull();
  });

  it("web de referencia de diseño → sin error de validación", () => {
    expect(validarEnlace("Diseño de referencia", "https://www.behance.net/gallery/12345")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// puedeAgregarEnlace — roles autorizados
// ---------------------------------------------------------------------------
describe("puedeAgregarEnlace — usuario sin permisos rechazado", () => {
  it("disenador NO puede añadir enlace", () => {
    expect(puedeAgregarEnlace("disenador")).toBe(false);
  });

  it("responsable_diseno NO puede añadir enlace", () => {
    expect(puedeAgregarEnlace("responsable_diseno")).toBe(false);
  });

  it("rol null NO puede añadir enlace", () => {
    expect(puedeAgregarEnlace(null)).toBe(false);
  });

  it("rol undefined NO puede añadir enlace", () => {
    expect(puedeAgregarEnlace(undefined)).toBe(false);
  });
});

describe("puedeAgregarEnlace — roles autorizados", () => {
  it("comercial_nacional puede añadir", () => {
    expect(puedeAgregarEnlace("comercial_nacional")).toBe(true);
  });

  it("comercial_exportacion puede añadir", () => {
    expect(puedeAgregarEnlace("comercial_exportacion")).toBe(true);
  });

  it("responsable_nacional puede añadir", () => {
    expect(puedeAgregarEnlace("responsable_nacional")).toBe(true);
  });

  it("responsable_exportacion puede añadir", () => {
    expect(puedeAgregarEnlace("responsable_exportacion")).toBe(true);
  });

  it("admin puede añadir", () => {
    expect(puedeAgregarEnlace("admin")).toBe(true);
  });

  it("marketing puede añadir", () => {
    expect(puedeAgregarEnlace("marketing")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// puedeEliminarEnlace — permisos de borrado
// ---------------------------------------------------------------------------
describe("puedeEliminarEnlace — quién puede eliminar un enlace", () => {
  const CREATOR_ID = "uid-creator";
  const OTHER_ID = "uid-other";

  it("el creador puede eliminar su propio enlace", () => {
    expect(puedeEliminarEnlace("comercial_nacional", CREATOR_ID, CREATOR_ID)).toBe(true);
  });

  it("otro comercial NO puede eliminar el enlace de otra persona", () => {
    expect(puedeEliminarEnlace("comercial_nacional", CREATOR_ID, OTHER_ID)).toBe(false);
  });

  it("admin puede eliminar cualquier enlace (incluido de otro usuario)", () => {
    expect(puedeEliminarEnlace("admin", CREATOR_ID, OTHER_ID)).toBe(true);
  });

  it("marketing puede eliminar cualquier enlace (incluido de otro usuario)", () => {
    expect(puedeEliminarEnlace("marketing", CREATOR_ID, OTHER_ID)).toBe(true);
  });

  it("diseñador NO puede eliminar un enlace externo de otro", () => {
    expect(puedeEliminarEnlace("disenador", CREATOR_ID, OTHER_ID)).toBe(false);
  });

  it("diseñador tampoco puede eliminar su propio enlace (no debería haber creado uno)", () => {
    expect(puedeEliminarEnlace("disenador", OTHER_ID, OTHER_ID)).toBe(false);
  });

  it("subido_por null → comercial no puede eliminar", () => {
    expect(puedeEliminarEnlace("comercial_nacional", null, CREATOR_ID)).toBe(false);
  });

  it("subido_por null → admin sí puede eliminar", () => {
    expect(puedeEliminarEnlace("admin", null, CREATOR_ID)).toBe(true);
  });

  it("currentUserId null → comercial no puede eliminar", () => {
    expect(puedeEliminarEnlace("comercial_nacional", CREATOR_ID, null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// esEnlaceExterno — no se puede eliminar adjunto que no sea enlace_externo
// ---------------------------------------------------------------------------
describe("esEnlaceExterno — el guard del server action", () => {
  it("'enlace_externo' es un enlace externo", () => {
    expect(esEnlaceExterno("enlace_externo")).toBe(true);
  });

  it("'diseno_portada' NO es un enlace externo", () => {
    expect(esEnlaceExterno("diseno_portada")).toBe(false);
  });

  it("'adjunto_comercial' NO es un enlace externo", () => {
    expect(esEnlaceExterno("adjunto_comercial")).toBe(false);
  });

  it("'modificacion' NO es un enlace externo", () => {
    expect(esEnlaceExterno("modificacion")).toBe(false);
  });

  it("'logo_general' NO es un enlace externo", () => {
    expect(esEnlaceExterno("logo_general")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// filtrado de adjuntos — los enlaces aparecen correctamente junto a archivos
// ---------------------------------------------------------------------------
describe("filtrado de adjuntos — separación de enlaces y archivos físicos", () => {
  const adjuntos = [
    { tipo: "logo_general", url: "https://storage/logo.png", nombre: "logo.png" },
    { tipo: "diseno_portada", url: "https://storage/diseno.pdf", nombre: "diseno.pdf" },
    { tipo: "enlace_externo", url: "https://we.tl/xxxxx", nombre: "WeTransfer" },
    { tipo: "adjunto_comercial", url: "https://storage/doc.pdf", nombre: "doc.pdf" },
    { tipo: "enlace_externo", url: "https://drive.google.com/abc", nombre: "Google Drive" },
  ];

  it("filtra correctamente solo los enlaces externos", () => {
    const enlaces = adjuntos.filter((a) => a.tipo === "enlace_externo");
    expect(enlaces).toHaveLength(2);
    expect(enlaces.every((e) => e.tipo === "enlace_externo")).toBe(true);
  });

  it("filtra correctamente los archivos físicos (excluye enlaces)", () => {
    const archivos = adjuntos.filter((a) => a.tipo !== "enlace_externo");
    expect(archivos).toHaveLength(3);
    expect(archivos.every((a) => a.tipo !== "enlace_externo")).toBe(true);
  });

  it("los adjuntos están correctamente representados en ambos grupos", () => {
    const enlaces = adjuntos.filter((a) => a.tipo === "enlace_externo");
    const archivos = adjuntos.filter((a) => a.tipo !== "enlace_externo");
    expect(enlaces.length + archivos.length).toBe(adjuntos.length);
  });

  it("un adjunto de tipo enlace_externo tiene una URL externa (no de Storage)", () => {
    const enlace = adjuntos.find((a) => a.nombre === "WeTransfer");
    expect(enlace?.url.startsWith("https://we.tl")).toBe(true);
  });
});
