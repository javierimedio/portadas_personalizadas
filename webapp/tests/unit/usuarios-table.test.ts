import { describe, expect, it } from "vitest";
import { filterPerfiles, statsPorRol } from "@/features/usuarios/domain/table";
import type { PerfilUsuario } from "@/features/usuarios/domain/types";

function perfil(overrides: Partial<PerfilUsuario> = {}): PerfilUsuario {
  return {
    id: "1",
    nombre: "Ana García",
    email: "ana@gor.es",
    rol: "comercial_nacional",
    codigo: "COM01",
    activo: true,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("filterPerfiles", () => {
  const perfiles = [
    perfil({ id: "a", nombre: "Ana García", email: "ana@gor.es", codigo: "COM01", rol: "comercial_nacional", activo: true }),
    perfil({ id: "b", nombre: "Bea López", email: "bea@gor.es", codigo: "MKT01", rol: "marketing", activo: false }),
  ];

  it("busca por nombre, email o código (case-insensitive)", () => {
    expect(filterPerfiles(perfiles, { q: "ana", rol: "", activo: "" }).map((p) => p.id)).toEqual(["a"]);
    expect(filterPerfiles(perfiles, { q: "MKT01", rol: "", activo: "" }).map((p) => p.id)).toEqual(["b"]);
    expect(filterPerfiles(perfiles, { q: "bea@gor.es", rol: "", activo: "" }).map((p) => p.id)).toEqual(["b"]);
  });

  it("filtra por rol", () => {
    expect(filterPerfiles(perfiles, { q: "", rol: "marketing", activo: "" }).map((p) => p.id)).toEqual(["b"]);
  });

  it("filtra por estado activo/inactivo", () => {
    expect(filterPerfiles(perfiles, { q: "", rol: "", activo: "true" }).map((p) => p.id)).toEqual(["a"]);
    expect(filterPerfiles(perfiles, { q: "", rol: "", activo: "false" }).map((p) => p.id)).toEqual(["b"]);
  });
});

describe("statsPorRol", () => {
  it("cuenta solo usuarios activos, sobre todos los perfiles (no los filtrados)", () => {
    const perfiles = [
      perfil({ id: "a", rol: "marketing", activo: true }),
      perfil({ id: "b", rol: "marketing", activo: false }),
      perfil({ id: "c", rol: "admin", activo: true }),
    ];
    const stats = statsPorRol(perfiles);
    expect(stats.find((s) => s.rol === "marketing")?.count).toBe(1);
    expect(stats.find((s) => s.rol === "admin")?.count).toBe(1);
    expect(stats.find((s) => s.rol === "comercial_nacional")?.count).toBe(0);
  });
});
