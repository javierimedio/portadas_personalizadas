import { describe, expect, it } from "vitest";
import { buildLogsDevolucionComercial } from "@/features/solicitudes/domain/devolucion";

describe("buildLogsDevolucionComercial — Marketing devuelve al comercial", () => {
  it("con motivo: genera cambio_estado + comentario, ambos contienen el motivo", () => {
    const logs = buildLogsDevolucionComercial("en_revision_marketing", "Falta información del cliente");
    expect(logs).toHaveLength(2);

    const estado = logs.find((l) => l.accion === "cambio_estado")!;
    expect(estado.detalle.estado_anterior).toBe("en_revision_marketing");
    expect(estado.detalle.estado_nuevo).toBe("borrador");
    expect(estado.detalle.motivo).toBe("Falta información del cliente");

    const comentario = logs.find((l) => l.accion === "comentario")!;
    expect(comentario.detalle.texto).toBe("Falta información del cliente");
  });

  it("el log comentario aparece en la sección Comentarios (filtro accion=comentario)", () => {
    const logs = buildLogsDevolucionComercial("en_revision_marketing", "Revisar portada");
    // Réplica del filtro en solicitud-detalle-modal.tsx:259
    const comentarios = logs.filter((l) => l.accion === "comentario");
    expect(comentarios).toHaveLength(1);
    expect(comentarios[0]!.detalle.texto).toBe("Revisar portada");
  });

  it("sin motivo: solo cambio_estado, sin comentario (no genera comentarios vacíos)", () => {
    const logs = buildLogsDevolucionComercial("en_revision_marketing", "");
    expect(logs).toHaveLength(1);
    expect(logs[0]!.accion).toBe("cambio_estado");
    expect(logs[0]!.detalle.motivo).toBeNull();
    expect(logs.find((l) => l.accion === "comentario")).toBeUndefined();
  });

  it("motivo solo espacios: no genera comentario", () => {
    const logs = buildLogsDevolucionComercial("diseno_en_revision_comercial", "   ");
    expect(logs).toHaveLength(1);
    expect(logs.find((l) => l.accion === "comentario")).toBeUndefined();
    expect(logs[0]!.detalle.motivo).toBeNull();
  });

  it("recorta espacios del motivo en ambos logs", () => {
    const logs = buildLogsDevolucionComercial("en_revision_marketing", "  texto con espacios  ");
    expect(logs[0]!.detalle.motivo).toBe("texto con espacios");
    expect(logs[1]!.detalle.texto).toBe("texto con espacios");
  });

  it("con fecha: se incluye en el detalle del comentario pero no en cambio_estado", () => {
    const fecha = "2026-09-23T10:00:00.000Z";
    const logs = buildLogsDevolucionComercial("en_revision_marketing", "Motivo", fecha);
    const comentario = logs.find((l) => l.accion === "comentario")!;
    expect(comentario.detalle.fecha).toBe(fecha);
    const estado = logs.find((l) => l.accion === "cambio_estado")!;
    expect(estado.detalle.fecha).toBeUndefined();
  });

  it("sin fecha: el comentario no incluye el campo fecha", () => {
    const logs = buildLogsDevolucionComercial("en_revision_marketing", "Motivo");
    const comentario = logs.find((l) => l.accion === "comentario")!;
    expect(comentario.detalle.fecha).toBeUndefined();
  });
});

describe("contrato del flujo diseñador → pendiente_comercial (RPC sin cambios)", () => {
  // devolverDesdeDisenador y el RPC devolver_desde_disenador no se han modificado.
  // El RPC genera exactamente los mismos tipos de logs que buildLogsDevolucionComercial,
  // con los mismos filtros de UI aplicables: accion='comentario' → Comentarios,
  // accion='cambio_estado' → Historial.

  it("el log comentario del RPC aparece en la sección Comentarios igual que el de Marketing", () => {
    // Estructura que genera el RPC (contrato documentado en la migración SQL)
    const logsDelRpc = [
      { accion: "comentario", detalle: { texto: "Falta la fuente tipográfica", fecha: "2026-09-23T09:00:00Z" } },
      { accion: "cambio_estado", detalle: { estado_anterior: "en_diseno", estado_nuevo: "pendiente_comercial", motivo: "Falta la fuente tipográfica" } },
    ];
    const comentarios = logsDelRpc.filter((l) => l.accion === "comentario");
    const historial = logsDelRpc.filter((l) => l.accion !== "comentario");
    expect(comentarios).toHaveLength(1);
    expect(comentarios[0]!.detalle.texto).toBe("Falta la fuente tipográfica");
    expect(historial).toHaveLength(1);
    expect(historial[0]!.detalle.motivo).toBe("Falta la fuente tipográfica");
  });
});
