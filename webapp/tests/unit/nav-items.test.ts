import { describe, expect, it } from "vitest";
import { getNavItemsForRole } from "@/features/layout/domain/nav-items";

function ids(rol: string | null) {
  return getNavItemsForRole(rol).map((i) => i.id);
}

describe("getNavItemsForRole", () => {
  it("admin ve todo", () => {
    expect(ids("admin")).toEqual([
      "dashboard",
      "solicitudes",
      "panel",
      "diseno",
      "campanas",
      "usuarios",
    ]);
  });

  it("marketing ve lo mismo que admin", () => {
    expect(ids("marketing")).toEqual(ids("admin"));
  });

  it("comercial_nacional solo ve solicitudes", () => {
    expect(ids("comercial_nacional")).toEqual(["solicitudes"]);
  });

  it("responsable_nacional ve dashboard y solicitudes", () => {
    expect(ids("responsable_nacional")).toEqual(["dashboard", "solicitudes"]);
  });

  it("disenador solo ve diseno", () => {
    expect(ids("disenador")).toEqual(["diseno"]);
  });

  it("responsable_diseno solo ve diseno, NO dashboard (ver 01-analisis-funcional.md § 1.3)", () => {
    expect(ids("responsable_diseno")).toEqual(["diseno"]);
  });

  it("H-07: los roles legacy genéricos sin sufijo no ven ningún item", () => {
    expect(ids("comercial")).toEqual([]);
    expect(ids("responsable")).toEqual([]);
  });

  it("rol desconocido o nulo no ve ningún item", () => {
    expect(ids(null)).toEqual([]);
    expect(ids("lo-que-sea")).toEqual([]);
  });
});
