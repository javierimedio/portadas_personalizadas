import { describe, expect, it } from "vitest";
import { err, ok } from "@/shared/domain/result";

describe("Result", () => {
  it("ok() produce un resultado exitoso con los datos dados", () => {
    expect(ok(42)).toEqual({ ok: true, data: 42 });
  });

  it("err() produce un resultado de error con el mensaje dado", () => {
    expect(err("fallo")).toEqual({ ok: false, error: "fallo" });
  });
});
