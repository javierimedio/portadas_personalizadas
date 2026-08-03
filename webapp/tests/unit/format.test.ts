import { describe, expect, it } from "vitest";
import { fmtDate } from "@/shared/domain/format";

describe("fmtDate", () => {
  it("sin fecha devuelve un guion", () => {
    expect(fmtDate(null)).toBe("—");
    expect(fmtDate(undefined)).toBe("—");
  });

  it("formatea en dd/mm/yyyy hh:mm (es-ES)", () => {
    // Mediodía UTC evita que el desplazamiento horario del entorno de test
    // cambie el día calculado.
    const out = fmtDate("2026-03-05T12:00:00.000Z");
    expect(out).toMatch(/^05\/03\/2026 \d{2}:\d{2}$/);
  });
});
