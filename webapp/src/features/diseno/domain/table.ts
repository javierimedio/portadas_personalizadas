import type { SolicitudListItem } from "@/features/solicitudes/domain/table";
import type { FormPerfil } from "@/features/solicitudes/domain/types";

// Réplica de renderDisenoTable() (index.html ~2244-2306): todos los roles con
// acceso a la pestaña Diseño ven en_diseno/modificar_diseno, acotado por
// campaña y — opcionalmente, vía el mismo selector para cualquiera de esos
// roles, no solo disenador — por diseñador asignado. RLS ya decide qué filas
// llegan aquí (docs/03-modelo-datos.md § 3.5): disenador/responsable_diseno
// tienen acceso total, así que este filtro es puramente de presentación.
export type DisenoFilters = { campanaId: string; disenadorId: string };

const ESTADOS_DISENO = ["en_diseno", "modificar_diseno"];

export function filterDisenoTareas(rows: SolicitudListItem[], filters: DisenoFilters): SolicitudListItem[] {
  let result = filters.campanaId ? rows.filter((s) => s.campana_id === filters.campanaId) : rows;
  result = result.filter((s) => ESTADOS_DISENO.includes(s.estado));
  if (filters.disenadorId) result = result.filter((s) => s.asignado_id === filters.disenadorId);
  return result;
}

export const ROLES_FILTRO_DISENADOR_VISIBLE = ["admin", "marketing", "responsable_diseno", "disenador"];

// Réplica de la lista de opciones del selector de diseñador (~2258-2267).
export function disenadoresActivos(perfiles: FormPerfil[]): FormPerfil[] {
  return perfiles
    .filter((p) => ["disenador", "responsable_diseno"].includes(p.rol ?? "") && p.activo)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

// Estados que cuentan como "portada completada" desde la perspectiva del
// diseñador: diseno_en_revision_comercial (diseñador marcó listo, pendiente
// de confirmación del cliente) y confirmada (cliente aceptó el diseño).
// Ambos representan que el trabajo del diseñador está terminado; archivar
// sin confirmar se excluye porque puede llegar desde cualquier estado.
export const ESTADOS_DISENO_COMPLETADO = ["diseno_en_revision_comercial", "confirmada"] as const;

export type DisenadorStat = { id: string; nombre: string; count: number; completadas: number; color: "mid" | "red" | "green" };

// Réplica del contador por diseñador (~2274-2290): el umbral de color se
// calcula sobre `rows` ya filtradas (incluido el propio filtro de
// diseñador, si hay uno seleccionado) — es el mismo comportamiento del
// original, no una simplificación.
// `allRows` + `campanaId`: si se pasan, se calculan también las completadas
// por campaña sin aplicar el filtro de diseñador (para que el contador de
// completadas refleje el histórico de cada diseñador, no solo el que esté
// seleccionado en el filtro).
export function disenadorStats(
  rows: SolicitudListItem[],
  perfiles: FormPerfil[],
  allRows?: SolicitudListItem[],
  campanaId?: string
): DisenadorStat[] {
  const completadasRows =
    allRows?.filter(
      (s) =>
        (ESTADOS_DISENO_COMPLETADO as readonly string[]).includes(s.estado) &&
        (!campanaId || s.campana_id === campanaId)
    ) ?? [];
  return disenadoresActivos(perfiles).map((d) => {
    const count = rows.filter((s) => s.asignado_id === d.id).length;
    const completadas = completadasRows.filter((s) => s.asignado_id === d.id).length;
    const color: DisenadorStat["color"] = count === 0 ? "mid" : count > 5 ? "red" : "green";
    return { id: d.id, nombre: d.nombre, count, completadas, color };
  });
}
