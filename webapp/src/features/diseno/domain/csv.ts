// Réplica de exportDisenoCSV() (index.html ~5131-5161): TAB como separador,
// BOM UTF-8, columnas fijas CODIGO/ROLY/WRK/STM/XMAS (no las de la campaña
// activa — siempre estas cuatro). Un disenador (no responsable_diseno)
// exporta siempre solo sus propias tareas, sin importar qué muestre el
// selector de diseñador en pantalla — es una regla propia de la exportación,
// distinta de la del listado, no un descuido.
export type DisenoCsvCatalogo = {
  catalogo: string;
  portada_personalizada: boolean | null;
  portada_diseno_propio: boolean | null;
  portada_opcion_1: string | null;
  portada_elegida: string | null;
};

export type DisenoCsvRow = {
  cod_sap: string;
  estado: string;
  campana_id: string | null;
  asignado_id: string | null;
  solicitud_catalogos: DisenoCsvCatalogo[];
};

const FIXED_CATS = [
  { key: "roly", label: "ROLY" },
  { key: "roly_wrk", label: "WRK" },
  { key: "stamina", label: "STM" },
  { key: "xmas", label: "XMAS" },
] as const;

export function filasParaCsv(
  rows: DisenoCsvRow[],
  campanaId: string,
  rol: string | null | undefined,
  currentUserId: string | null | undefined
): DisenoCsvRow[] {
  let result = rows.filter((s) => ["en_diseno", "modificar_diseno"].includes(s.estado));
  if (campanaId) result = result.filter((s) => s.campana_id === campanaId);
  if (rol === "disenador") result = result.filter((s) => s.asignado_id === currentUserId);
  return result;
}

export function buildDisenoCsv(rows: DisenoCsvRow[]): string {
  const TAB = "\t";
  const NL = "\n";
  const BOM = "﻿";
  const headers = ["CODIGO", ...FIXED_CATS.map((c) => c.label)];
  const csvRows = [headers.join(TAB)];
  rows.forEach((s) => {
    const portadas = FIXED_CATS.map((cat) => {
      const c = s.solicitud_catalogos.find((x) => x.catalogo === cat.key);
      if (!c || !c.portada_personalizada) return "";
      return c.portada_diseno_propio ? "PROPIO" : c.portada_elegida || c.portada_opcion_1 || "";
    });
    csvRows.push([s.cod_sap, ...portadas].join(TAB));
  });
  return BOM + csvRows.join(NL);
}

export function disenoCsvFilename(campanaNombre: string | null | undefined, todayIso: string): string {
  return `diseno_${campanaNombre || "portadas"}_${todayIso}.csv`;
}
