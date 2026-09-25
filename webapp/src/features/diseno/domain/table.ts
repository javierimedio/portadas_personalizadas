import type { SolicitudListItem } from "@/features/solicitudes/domain/table";
import type { FormPerfil } from "@/features/solicitudes/domain/types";

// Filtros puramente de presentación: RLS ya decide qué filas llegan aquí
// (docs/03-modelo-datos.md § 3.5).
export type SortField = "cod_sap" | "nombre_empresa" | "provincia" | "roly" | "fecha" | "disenador" | "estado";
export type SortDir = "asc" | "desc";
export type SortConfig = { field: SortField; dir: SortDir };
export type DisenoFilters = {
  campanaId: string;
  disenadorId: string;
  q: string;
  estado?: string;
};

// Valor centinela para el filtro "Sin diseñador asignado" en el selector.
// No es un ID real; filterDisenoTareas lo interpreta como asignado_id === null.
export const UNASSIGNED_DISENADOR = "__unassigned__";

// Vista única de Diseño: los tres estados que forman la cola de trabajo.
const ESTADOS_DISENO = ["en_diseno", "modificar_diseno", "diseno_en_revision_comercial"];

function rolyVariant(s: SolicitudListItem): "empty" | "no" | "summary" {
  const cat = s.solicitud_catalogos.find((c) => c.catalogo === "roly");
  if (!cat || (cat.catalogo_impreso === null && cat.catalogo_digital === null)) return "empty";
  if (!cat.catalogo_impreso && !cat.catalogo_digital) return "no";
  return "summary";
}

export function filterDisenoTareas(rows: SolicitudListItem[], filters: DisenoFilters): SolicitudListItem[] {
  let result = filters.campanaId ? rows.filter((s) => s.campana_id === filters.campanaId) : rows;
  result = result.filter((s) => ESTADOS_DISENO.includes(s.estado));
  if (filters.estado && ESTADOS_DISENO.includes(filters.estado)) {
    result = result.filter((s) => s.estado === filters.estado);
  }
  if (filters.disenadorId === UNASSIGNED_DISENADOR) {
    result = result.filter((s) => !s.asignado_id);
  } else if (filters.disenadorId) {
    result = result.filter((s) => s.asignado_id === filters.disenadorId);
  }
  if (filters.q) {
    const q = filters.q.trim().toLowerCase();
    result = result.filter((s) => s.cod_sap?.toLowerCase().includes(q));
  }
  return result;
}

export function sortDisenoTareas(
  rows: SolicitudListItem[],
  sort: SortConfig | null,
  perfiles: FormPerfil[]
): SolicitudListItem[] {
  if (!sort) return rows;
  return [...rows].sort((a, b) => {
    let aVal: string | number = "";
    let bVal: string | number = "";
    switch (sort.field) {
      case "cod_sap":
        aVal = a.cod_sap ?? "";
        bVal = b.cod_sap ?? "";
        break;
      case "nombre_empresa":
        aVal = a.nombre_empresa ?? "";
        bVal = b.nombre_empresa ?? "";
        break;
      case "provincia":
        aVal = a.provincia ?? "";
        bVal = b.provincia ?? "";
        break;
      case "roly": {
        const score = { empty: 0, no: 1, summary: 2 } as const;
        aVal = score[rolyVariant(a)];
        bVal = score[rolyVariant(b)];
        break;
      }
      case "fecha":
        aVal = a.enviada_at ?? a.updated_at ?? "";
        bVal = b.enviada_at ?? b.updated_at ?? "";
        break;
      case "disenador":
        aVal = perfiles.find((p) => p.id === a.asignado_id)?.nombre ?? "";
        bVal = perfiles.find((p) => p.id === b.asignado_id)?.nombre ?? "";
        break;
      case "estado":
        aVal = a.estado ?? "";
        bVal = b.estado ?? "";
        break;
    }
    const cmp = typeof aVal === "number" && typeof bVal === "number" ? aVal - bVal : String(aVal).localeCompare(String(bVal));
    return sort.dir === "asc" ? cmp : -cmp;
  });
}

// ---------------------------------------------------------------------------
// URL state — parse and build query params for filters, sort and page
// ---------------------------------------------------------------------------
export type DisenoUrlState = {
  q: string;
  disenadorId: string;
  estado: string;
  sort: SortConfig;
  page: number;
};

const VALID_SORT_FIELDS: SortField[] = ["cod_sap", "nombre_empresa", "provincia", "roly", "fecha", "disenador", "estado"];

export function parseUrlState(params: URLSearchParams): DisenoUrlState {
  const rawSort = params.get("sort") ?? "";
  const sortField: SortField = VALID_SORT_FIELDS.includes(rawSort as SortField) ? (rawSort as SortField) : "fecha";
  const sortDir: SortDir = params.get("dir") === "desc" ? "desc" : "asc";
  const rawPage = parseInt(params.get("page") ?? "1", 10);
  return {
    q: params.get("q") ?? "",
    disenadorId: params.get("disenador") ?? "",
    estado: params.get("estado") ?? "",
    sort: { field: sortField, dir: sortDir },
    page: Math.max(1, isNaN(rawPage) ? 1 : rawPage),
  };
}

// Serializes state to URLSearchParams, omitting defaults to keep the URL clean.
export function buildUrlState(state: DisenoUrlState): URLSearchParams {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  if (state.disenadorId) p.set("disenador", state.disenadorId);
  if (state.estado) p.set("estado", state.estado);
  if (state.sort.field !== "fecha") p.set("sort", state.sort.field);
  if (state.sort.dir !== "asc") p.set("dir", state.sort.dir);
  if (state.page > 1) p.set("page", String(state.page));
  return p;
}

export const ROLES_FILTRO_DISENADOR_VISIBLE = ["admin", "marketing", "responsable_diseno", "disenador"];

export function disenadoresActivos(perfiles: FormPerfil[]): FormPerfil[] {
  return perfiles
    .filter((p) => ["disenador", "responsable_diseno"].includes(p.rol ?? "") && p.activo)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

// Correspondencia entre los 4 indicadores de KPI y los estados reales:
//   pendientes  → modificar_diseno            (devueltas para corrección)
//   enDiseno    → en_diseno                   (diseño inicial en curso)
//   mandadas    → diseno_en_revision_comercial (enviadas al comercial para revisión)
//   aprobadas   → confirmada                  (cliente confirmó el diseño)
export type DisenadorStat = {
  id: string;
  nombre: string;
  pendientes: number;
  enDiseno: number;
  mandadas: number;
  aprobadas: number;
};

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
