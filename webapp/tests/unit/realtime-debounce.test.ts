import { describe, expect, it } from "vitest";
import { debeActualizar } from "@/shared/domain/realtime-debounce";

describe("debeActualizar", () => {
  it("permite actualizar si ha pasado el tiempo de debounce", () => {
    expect(debeActualizar(0, 2000, 2000)).toBe(true);
    expect(debeActualizar(1000, 3001, 2000)).toBe(true);
  });

  it("bloquea si no ha pasado el debounce", () => {
    expect(debeActualizar(1000, 2500, 2000)).toBe(false);
    expect(debeActualizar(1000, 1000, 2000)).toBe(false);
  });

  it("usa 2000ms de debounce por defecto", () => {
    expect(debeActualizar(0, 1999)).toBe(false);
    expect(debeActualizar(0, 2000)).toBe(true);
  });
});
