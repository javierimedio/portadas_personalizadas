export type LogDevolucion = {
  accion: "cambio_estado" | "comentario";
  detalle: Record<string, unknown>;
};

// Construye los registros de log para una devolución de Marketing al comercial
// (cualquier estado → borrador). Siempre genera un log de cambio_estado; añade
// además un log de comentario si hay motivo, para que aparezca en la sección
// "Comentarios" del detalle (misma estructura que el RPC devolver_desde_disenador).
// `fecha` se pasa en runtime desde la server action; los tests pueden omitirla.
export function buildLogsDevolucionComercial(
  estadoAnterior: string,
  motivo: string,
  fecha?: string
): LogDevolucion[] {
  const motivoTrimmed = motivo.trim() || null;
  const logs: LogDevolucion[] = [
    {
      accion: "cambio_estado",
      detalle: { estado_anterior: estadoAnterior, estado_nuevo: "borrador", motivo: motivoTrimmed },
    },
  ];
  if (motivoTrimmed) {
    const detalle: Record<string, unknown> = { texto: motivoTrimmed };
    if (fecha) detalle.fecha = fecha;
    logs.push({ accion: "comentario", detalle });
  }
  return logs;
}
