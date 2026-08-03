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

export type DisenadorStat = { id: string; nombre: string; count: number; color: "mid" | "red" | "green" };

// Réplica del contador por diseñador (~2274-2290): el umbral de color se
// calcula sobre `rows` ya filtradas (incluido el propio filtro de
// diseñador, si hay uno seleccionado) — es el mismo comportamiento del
// original, no una simplificación.
export function disenadorStats(rows: SolicitudListItem[], perfiles: FormPerfil[]): DisenadorStat[] {
  return disenadoresActivos(perfiles).map((d) => {
    const count = rows.filter((s) => s.asignado_id === d.id).length;
    const color: DisenadorStat["color"] = count === 0 ? "mid" : count > 5 ? "red" : "green";
    return { id: d.id, nombre: d.nombre, count, color };
  });
}
