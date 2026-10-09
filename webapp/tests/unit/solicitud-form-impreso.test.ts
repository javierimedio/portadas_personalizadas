import { describe, expect, it } from "vitest";
import { applyImpresoChange } from "@/features/solicitudes/ui/solicitud-form";

// Estado base con unidades ya introducidas, como sucede cuando el comercial
// ha seleccionado impreso=si y ha tecleado cantidades antes de cambiar a no.
function stateConUnidades(catKey = "roly"): Record<string, ReturnType<typeof applyImpresoChange>[string]> {
  return {
    [catKey]: {
      portadaPersonalizada: "",
      digital: "si",
      impreso: "si",
      unidades: "500",
      conPrecios: "",
      disenoPropio: "",
      opcion1: "",
      opcion2: "",
      opcion3: "",
      posicionLogo: "",
    },
  };
}

describe("applyImpresoChange — limpieza de unidades al cambiar a NO", () => {
  // Test 1: cambiar de SÍ a NO limpia unidades
  it("impreso si→no: limpia unidades de todos los catálogos afectados", () => {
    const prev = stateConUnidades("roly");
    const next = applyImpresoChange(prev, "roly", "no");
    expect(next["roly"]!.impreso).toBe("no");
    expect(next["roly"]!.unidades).toBe("");
  });

  it("impreso si→no: limpia unidades de cualquier clave de catálogo", () => {
    const prev = stateConUnidades("stamina");
    const next = applyImpresoChange(prev, "stamina", "no");
    expect(next["stamina"]!.unidades).toBe("");
  });

  // Test 2: cambiar de NO a SÍ no recupera las cantidades anteriores
  it("impreso no→si: no recupera unidades (quedan vacías)", () => {
    // Simula el ciclo completo: tenía unidades, cambió a no (se limpiaron), vuelve a sí
    const conUnidades = stateConUnidades("roly");
    const despuesDeNo = applyImpresoChange(conUnidades, "roly", "no");
    expect(despuesDeNo["roly"]!.unidades).toBe(""); // limpiadas al pasar a no

    const vueltaASi = applyImpresoChange(despuesDeNo, "roly", "si");
    expect(vueltaASi["roly"]!.impreso).toBe("si");
    expect(vueltaASi["roly"]!.unidades).toBe(""); // siguen vacías — no se restauran
  });

  // Test 3: mantener SÍ conserva las cantidades introducidas
  it("impreso si→si: conserva las unidades ya introducidas", () => {
    const prev = stateConUnidades("roly");
    const next = applyImpresoChange(prev, "roly", "si");
    expect(next["roly"]!.impreso).toBe("si");
    expect(next["roly"]!.unidades).toBe("500"); // intactas
  });

  // Test 4: guardar después de cambiar a NO persiste unidades nulas
  // La conversión del Server Action es: Number("") || null === null
  it("unidades vacías se persisten como null al guardar (invariante del Server Action)", () => {
    const prev = stateConUnidades("roly");
    const next = applyImpresoChange(prev, "roly", "no");
    const unidadesParaFormData = next["roly"]!.unidades; // lo que el input controlado envía
    expect(unidadesParaFormData).toBe("");
    // Reproduce la lógica de readCat en save-solicitud.action.ts
    const persistido = Number(unidadesParaFormData) || null;
    expect(persistido).toBeNull();
  });

  // Test 5: funciona tanto en creación (catálogo no existente en prev) como en edición
  it("creación: catálogo sin estado previo — impreso→no inicializa con unidades vacías", () => {
    // En creación, prev no tiene entrada para el catálogo todavía
    const next = applyImpresoChange({}, "roly", "no");
    expect(next["roly"]!.impreso).toBe("no");
    expect(next["roly"]!.unidades).toBe("");
  });

  it("edición: solicitud existente con unidades preexistentes — impreso→no las limpia", () => {
    // Simula la inicialización desde buildInitialCatState (solicitud con unidades=250)
    const prev = {
      roly: {
        portadaPersonalizada: "si" as const,
        digital: "si" as const,
        impreso: "si" as const,
        unidades: "250", // venía de BD
        conPrecios: "no" as const,
        disenoPropio: "" as const,
        opcion1: "",
        opcion2: "",
        opcion3: "",
        posicionLogo: "",
      },
    };
    const next = applyImpresoChange(prev, "roly", "no");
    expect(next["roly"]!.impreso).toBe("no");
    expect(next["roly"]!.unidades).toBe("");
    // Los demás campos del catálogo no se alteran
    expect(next["roly"]!.portadaPersonalizada).toBe("si");
    expect(next["roly"]!.digital).toBe("si");
    expect(next["roly"]!.conPrecios).toBe("no");
  });

  it("otros catálogos del estado no se ven afectados", () => {
    const prev = {
      roly: { ...stateConUnidades("roly")["roly"]! },
      stamina: { ...stateConUnidades("stamina")["stamina"]! },
    };
    const next = applyImpresoChange(prev, "roly", "no");
    // roly limpiado
    expect(next["roly"]!.unidades).toBe("");
    // stamina intacto
    expect(next["stamina"]!.unidades).toBe("500");
    expect(next["stamina"]!.impreso).toBe("si");
  });
});
