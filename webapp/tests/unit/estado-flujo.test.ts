import { describe, expect, it } from "vitest";
import { accionesDetalle, puedeElegirPortadaFinal } from "@/features/solicitudes/domain/estado-flujo";

describe("accionesDetalle", () => {
  it("borrador: comercial puede editar, enviar y eliminar; nada más", () => {
    const a = accionesDetalle("comercial_nacional", "borrador");
    expect(a.puedeEditar).toBe(true);
    expect(a.puedeEnviarAMarketing).toBe(true);
    expect(a.puedeEliminar).toBe(true);
    expect(a.puedeIniciarRevision).toBe(false);
    expect(a.puedeAsignarCanal).toBe(false);
  });

  it("admin/marketing pueden editar y eliminar en cualquier estado", () => {
    for (const estado of ["enviada", "en_diseno", "confirmada", "archivada"]) {
      expect(accionesDetalle("admin", estado).puedeEditar).toBe(true);
      expect(accionesDetalle("admin", estado).puedeEliminar).toBe(true);
      expect(accionesDetalle("marketing", estado).puedeAsignarCanal).toBe(true);
    }
    expect(accionesDetalle("comercial_nacional", "enviada").puedeEliminar).toBe(false);
  });

  it("enviada: solo gestor puede iniciar revisión o devolver a borrador", () => {
    expect(accionesDetalle("marketing", "enviada").puedeIniciarRevision).toBe(true);
    expect(accionesDetalle("marketing", "enviada").puedeDevolverABorrador).toBe(true);
    expect(accionesDetalle("comercial_nacional", "enviada").puedeIniciarRevision).toBe(false);
  });

  it("en_revision_marketing: gestor puede enviar a diseño o devolver", () => {
    const a = accionesDetalle("admin", "en_revision_marketing");
    expect(a.puedeEnviarADiseno).toBe(true);
    expect(a.puedeDevolverABorrador).toBe(true);
  });

  it("en_diseno/modificar_diseno: roles de diseño pueden asignar diseñador y marcar listo", () => {
    for (const estado of ["en_diseno", "modificar_diseno"]) {
      expect(accionesDetalle("disenador", estado).puedeAsignarDisenador).toBe(true);
      expect(accionesDetalle("responsable_diseno", estado).puedeMarcarDisenoListo).toBe(true);
      expect(accionesDetalle("comercial_nacional", estado).puedeAsignarDisenador).toBe(false);
    }
  });

  it("diseno_en_revision_comercial: comercial/responsable/gestor pueden confirmar, modificar o archivar", () => {
    for (const rol of ["comercial_nacional", "responsable_exportacion", "admin", "marketing"]) {
      const a = accionesDetalle(rol, "diseno_en_revision_comercial");
      expect(a.puedeConfirmar).toBe(true);
      expect(a.puedeSolicitarModificacion).toBe(true);
      expect(a.puedeArchivar).toBe(true);
    }
    expect(accionesDetalle("disenador", "diseno_en_revision_comercial").puedeConfirmar).toBe(false);
  });
});

describe("puedeElegirPortadaFinal", () => {
  it("solo admin/marketing, solo en revisión de marketing o en diseño", () => {
    expect(puedeElegirPortadaFinal("admin", "en_revision_marketing")).toBe(true);
    expect(puedeElegirPortadaFinal("marketing", "en_diseno")).toBe(true);
    expect(puedeElegirPortadaFinal("admin", "borrador")).toBe(false);
    expect(puedeElegirPortadaFinal("disenador", "en_diseno")).toBe(false);
  });
});
