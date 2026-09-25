import { describe, expect, it } from "vitest";
import { isInteractiveTarget, shouldOpenOnKey } from "@/features/diseno/ui/diseno-table";

// Tests for the row-click delegation logic in DisenoTable.
// isInteractiveTarget: returns true when a click lands on an interactive
//   element (button/a/input/select/textarea) — the row should NOT open detail.
// shouldOpenOnKey: returns true for Enter and Space — keyboard activation.

// ---------------------------------------------------------------------------
// isInteractiveTarget — informative zones open detail (return false)
// ---------------------------------------------------------------------------
describe("isInteractiveTarget — zona informativa → no es interactivo", () => {
  it("null target → false (abre detalle)", () => {
    expect(isInteractiveTarget(null)).toBe(false);
  });

  it("td → false (Caso A/B/C: clic en empresa, SAP o zona vacía)", () => {
    const td = document.createElement("td");
    expect(isInteractiveTarget(td)).toBe(false);
  });

  it("span informativo dentro de td → false", () => {
    const td = document.createElement("td");
    const span = document.createElement("span");
    td.appendChild(span);
    expect(isInteractiveTarget(span)).toBe(false);
  });

  it("strong (SAP) → false", () => {
    const strong = document.createElement("strong");
    expect(isInteractiveTarget(strong)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isInteractiveTarget — controles interactivos NO abren detalle (return true)
// ---------------------------------------------------------------------------
describe("isInteractiveTarget — control interactivo → no abre detalle", () => {
  it("button → true (Caso D/E: Ver y Asignarme no disparan apertura)", () => {
    const btn = document.createElement("button");
    expect(isInteractiveTarget(btn)).toBe(true);
  });

  it("span hijo de button → true (propagación hacia button)", () => {
    const btn = document.createElement("button");
    const span = document.createElement("span");
    btn.appendChild(span);
    expect(isInteractiveTarget(span)).toBe(true);
  });

  it("a → true (Caso F: enlace mantiene su comportamiento)", () => {
    const a = document.createElement("a");
    a.href = "#";
    expect(isInteractiveTarget(a)).toBe(true);
  });

  it("span hijo de a → true", () => {
    const a = document.createElement("a");
    const span = document.createElement("span");
    a.appendChild(span);
    expect(isInteractiveTarget(span)).toBe(true);
  });

  it("input → true", () => {
    const input = document.createElement("input");
    expect(isInteractiveTarget(input)).toBe(true);
  });

  it("select → true", () => {
    const sel = document.createElement("select");
    expect(isInteractiveTarget(sel)).toBe(true);
  });

  it("textarea → true", () => {
    const ta = document.createElement("textarea");
    expect(isInteractiveTarget(ta)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// shouldOpenOnKey — activación por teclado (Caso G)
// ---------------------------------------------------------------------------
describe("shouldOpenOnKey — activación por teclado", () => {
  it("Enter → abre detalle", () => {
    expect(shouldOpenOnKey("Enter")).toBe(true);
  });

  it("Space → abre detalle", () => {
    expect(shouldOpenOnKey(" ")).toBe(true);
  });

  it("Tab → no abre", () => {
    expect(shouldOpenOnKey("Tab")).toBe(false);
  });

  it("Escape → no abre", () => {
    expect(shouldOpenOnKey("Escape")).toBe(false);
  });

  it("letra cualquiera → no abre", () => {
    expect(shouldOpenOnKey("a")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Garantía de no-regresión: las vistas usan el mismo mecanismo
// La lógica de delegación es idéntica para ambas vistas (operativo /
// enviadas_comercial) ya que vive en el <tr> genérico — el mismo helper
// cubre las dos vistas sin bifurcación.
// ---------------------------------------------------------------------------
describe("ambas vistas — mismo mecanismo de apertura", () => {
  it("td es no-interactivo en cualquier vista (mismo helper)", () => {
    const td = document.createElement("td");
    expect(isInteractiveTarget(td)).toBe(false);
  });

  it("button es interactivo en cualquier vista (mismo helper)", () => {
    const btn = document.createElement("button");
    expect(isInteractiveTarget(btn)).toBe(true);
  });
});
