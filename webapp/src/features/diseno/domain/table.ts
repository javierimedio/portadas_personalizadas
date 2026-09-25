import type { SolicitudListItem } from "@/features/solicitudes/domain/table";
import type { FormPerfil } from "@/features/solicitudes/domain/types";

// Réplica de renderDisenoTable() (index.html ~2244-2306): todos los roles con
// acceso a la pestaña Diseño ven en_diseno/modificar_diseno, acotado por
// campaña, diseñador y búsqueda SAP. RLS ya decide qué filas llegan aquí
// (docs/03-modelo-datos.md § 3.5): estos filtros son puramente de presentación.
export type DisenoVista = "operativo" | "enviadas_comercial";
export type DisenoFilters = { campanaId: string; disenadorId: string; q: string; vista?: DisenoVista };

// Valor centinela para el filtro "Sin diseñador asignado" en el selector.
// No es un ID real; filterDisenoTareas lo interpreta como asignado_id === null.
export const UNASSIGNED_DISENADOR = "__unassigned__";

const ESTADOS_DISENO = ["en_diseno", "modificar_diseno"];
const ESTADOS_COMERCIAL = ["diseno_en_revision_comercial"];

export function filterDisenoTareas(rows: SolicitudListItem[], filters: DisenoFilters): SolicitudListItem[] {
  const estados = filters.vista === "enviadas_comercial" ? ESTADOS_COMERCIAL : ESTADOS_DISENO;
  let result = filters.campanaId ? rows.filter((s) => s.campana_id === filters.campanaId) : rows;
  result = result.filter((s) => estados.includes(s.estado));
  if (filters.disenadorId === UNASSIGNED_DISENADOR) {
    result = result.filter((s) => !s.asignado_id);
  } else if (filters.disenadorId) {
    result = result.filter((s) => s.asignado_id === filters.disenadorId);
  }
  if (filters.q) {
    const q = filters.q.trim().toLowerCase();
    result = result.filter(
      (s) =>
        s.cod_sap?.toLowerCase().includes(q) ||
        s.nombre_empresa?.toLowerCase().includes(q) ||
        s.provincia?.toLowerCase().includes(q)
    );
  }
  return result;
}

export const ROLES_FILTRO_DISENADOR_VISIBLE = ["admin", "marketing", "responsable_diseno", "disenador"];

// Réplica de la lista de opciones del selector de diseñador (~2258-2267).
export function disenadoresActivos(perfiles: FormPerfil[]): FormPerfil[] {
  return perfiles
    .filter((p) => ["disenador", "responsable_diseno"].includes(p.rol ?? "") && p.activo)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

// Correspondencia entre los 4 indicadores de KPI y los estados reales:
//   pendientes  → modificar_diseno            (devueltas para corrección, pendientes de rehacer)
//   enDiseno    → en_diseno                   (diseño inicial en curso o recién asignado)
//   mandadas    → diseno_en_revision_comercial (enviadas al comercial para revisión)
//   aprobadas   → confirmada                  (cliente confirmó el diseño)
//
// Nota: en_diseno engloba "pendiente de comenzar" y "trabajo iniciado",
// ya que el flujo no distingue entre ambas subfases.
export type DisenadorStat = {
  id: string;
  nombre: string;
  pendientes: number;
  enDiseno: number;
  mandadas: number;
  aprobadas: number;
};

// Calcula los 4 indicadores por diseñador activo sobre el conjunto completo
// de solicitudes (allRows), filtrando por campaña cuando campanaId está
// definido, y opcionalmente por diseñador individual (disenadorId).
// Los diseñadores sin ninguna solicitud en ninguna de las 4 fases se omiten.
// El buscador SAP afecta únicamente a la tabla — no a estas KPIs.
export function disenadorStats(
  allRows: SolicitudListItem[],
  perfiles: FormPerfil[],
  campanaId: string,
  disenadorId?: string
): DisenadorStat[] {
  const rows = campanaId ? allRows.filter((s) => s.campana_id === campanaId) : allRows;
  const designers = disenadorId
    ? disenadoresActivos(perfiles).filter((d) => d.id === disenadorId)
    : disenadoresActivos(perfiles);

  return designers
    .map((d) => {
      const mine = rows.filter((s) => s.asignado_id === d.id);
      const pendientes = mine.filter((s) => s.estado === "modificar_diseno").length;
      const enDiseno = mine.filter((s) => s.estado === "en_diseno").length;
      const mandadas = mine.filter((s) => s.estado === "diseno_en_revision_comercial").length;
      const aprobadas = mine.filter((s) => s.estado === "confirmada").length;
      return { id: d.id, nombre: d.nombre, pendientes, enDiseno, mandadas, aprobadas };
    })
    .filter((d) => d.pendientes + d.enDiseno + d.mandadas + d.aprobadas > 0);
}
