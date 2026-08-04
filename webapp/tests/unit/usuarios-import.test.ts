import { describe, expect, it } from "vitest";
import { parseImportRows, rolValido } from "@/features/usuarios/domain/import";

describe("parseImportRows", () => {
  it("salta la fila de cabecera si la primera celda contiene 'email'", () => {
    const rows = [
      ["Email", "Nombre", "Password", "Rol", "Codigo"],
      ["ana@gor.es", "Ana García", "clave1234", "comercial_nacional", "COM01"],
    ];
    expect(parseImportRows(rows)).toEqual([
      { email: "ana@gor.es", nombre: "Ana García", pass: "clave1234", rol: "comercial_nacional", codigo: "COM01" },
    ]);
  });

  it("sin cabecera, procesa desde la primera fila", () => {
    const rows = [["ana@gor.es", "Ana García", "clave1234", "marketing", "MKT01"]];
    expect(parseImportRows(rows)).toHaveLength(1);
  });

  it("filtra filas sin email/nombre/contraseña", () => {
    const rows = [
      ["ana@gor.es", "Ana García", "clave1234", "marketing", "MKT01"],
      ["", "Sin email", "clave1234", "marketing", ""],
      ["bea@gor.es", "", "clave1234", "marketing", ""],
      ["carla@gor.es", "Carla", "", "marketing", ""],
    ];
    expect(parseImportRows(rows).map((u) => u.email)).toEqual(["ana@gor.es"]);
  });

  it("normaliza el rol a minúsculas y sin espacios", () => {
    const rows = [["ana@gor.es", "Ana García", "clave1234", "  MARKETING  ", ""]];
    expect(parseImportRows(rows)[0]?.rol).toBe("marketing");
  });

  it("rol vacío se deja vacío (H-07): no cae a ningún rol legacy por defecto", () => {
    const sinRol = [["ana@gor.es", "Ana García", "clave1234", "", ""]];
    expect(parseImportRows(sinRol)[0]?.rol).toBe("");
    expect(rolValido(parseImportRows(sinRol)[0]?.rol ?? "")).toBe(false);
  });

  it("sin filas, devuelve vacío", () => {
    expect(parseImportRows([])).toEqual([]);
  });
});

describe("rolValido", () => {
  it("acepta los roles reales de la aplicación, incluidas las variantes de canal (corrección H-13)", () => {
    expect(rolValido("comercial_nacional")).toBe(true);
    expect(rolValido("comercial_exportacion")).toBe(true);
    expect(rolValido("responsable_nacional")).toBe(true);
    expect(rolValido("responsable_exportacion")).toBe(true);
    expect(rolValido("responsable_diseno")).toBe(true);
    expect(rolValido("marketing")).toBe(true);
    expect(rolValido("disenador")).toBe(true);
    expect(rolValido("admin")).toBe(true);
  });

  it("rechaza los roles legacy sin sufijo de canal (H-07: no existe ningún usuario real con estos roles)", () => {
    expect(rolValido("comercial")).toBe(false);
    expect(rolValido("responsable")).toBe(false);
  });

  it("rechaza roles inexistentes", () => {
    expect(rolValido("superadmin")).toBe(false);
    expect(rolValido("")).toBe(false);
  });
});
