import { describe, expect, it } from "vitest";
import { passwordStrength } from "@/features/perfil/domain/password-strength";

describe("passwordStrength", () => {
  it("cadena vacía => Muy débil (score 0)", () => {
    expect(passwordStrength("").text).toBe("Muy débil");
  });

  it("8+ caracteres solo minúsculas => Muy débil (score 1: solo longitud≥8)", () => {
    expect(passwordStrength("abcdefgh").text).toBe("Muy débil");
  });

  it("12+ caracteres solo minúsculas => Débil (score 2: longitud≥8 y ≥12)", () => {
    expect(passwordStrength("abcdefghijkl").text).toBe("Débil");
  });

  it("8 con mayúsculas y minúsculas (sin llegar a 12) => Débil (score 2: longitud≥8 + mayús/minús)", () => {
    expect(passwordStrength("Abcdefgh").text).toBe("Débil");
  });

  it("8 con mayúsculas, minúsculas y número => Aceptable (score 3)", () => {
    expect(passwordStrength("Abcdefg1").text).toBe("Aceptable");
  });

  it("9 con mayúsculas, minúsculas, número y símbolo (sin llegar a 12) => Fuerte (score 4)", () => {
    expect(passwordStrength("Abcdefg1!").text).toBe("Fuerte");
  });

  it("12+ con mayúsculas, minúsculas, número y símbolo => Muy fuerte (score 5)", () => {
    expect(passwordStrength("Abcdefghij1!").text).toBe("Muy fuerte");
  });
});
