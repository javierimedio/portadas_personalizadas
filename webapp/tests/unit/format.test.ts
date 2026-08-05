import { describe, expect, it } from "vitest";
import { fmtDate, matchOptionCaseInsensitive } from "@/shared/domain/format";

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

describe("matchOptionCaseInsensitive", () => {
  const list = ["Español", "Madrid", "Ceuta"];

  it("sin valor guardado devuelve cadena vacía", () => {
    expect(matchOptionCaseInsensitive(list, null)).toBe("");
    expect(matchOptionCaseInsensitive(list, undefined)).toBe("");
  });

  it("encuentra la opción real ignorando mayúsculas/minúsculas (docs § H-08)", () => {
    expect(matchOptionCaseInsensitive(list, "MADRID")).toBe("Madrid");
    expect(matchOptionCaseInsensitive(list, "eSpAñOl")).toBe("Español");
  });

  it("si no hay ninguna coincidencia, devuelve el valor guardado tal cual", () => {
    expect(matchOptionCaseInsensitive(list, "FRANCIA")).toBe("FRANCIA");
  });
});
