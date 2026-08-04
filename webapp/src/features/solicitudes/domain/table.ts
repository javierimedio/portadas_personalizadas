import { ROLES_POR_CANAL } from "./constants";
import type { FormPerfil } from "./types";

// Réplica de renderComercialTable() en index.html (~2012-2121): filtrado,
// mini-stats y reglas de la tabla "Mis solicitudes" (SOL-05 a SOL-10, SOL-24).
export type SolicitudCatalogoRow = {
  catalogo: string;
  catalogo_digital: boolean | null;
  catalogo_impreso: boolean | null;
  unidades: number | null;
  portada_personalizada: boolean | null;
  portada_diseno_propio: boolean | null;
  portada_opcion_1: string | null;
  portada_opcion_2: string | null;
  portada_opcion_3: string | null;
  portada_elegida: string | null;
  posicion_logo: string | null;
  con_precios: boolean | null;
};

export type SolicitudListItem = {
  id: string;
  cod_sap: string;
  nombre_empresa: string | null;
  provincia: string | null;
  idioma: string | null;
  comentarios: string | null;
  canal: string | null;
  comercial_id: string | null;
  campana_id: string | null;
  asignado_id: string | null;
  estado: string;
  updated_at: string;
  solicitud_catalogos: SolicitudCatalogoRow[];
  adjuntos: { nombre: string; url: string; tipo: string }[];
};

// Réplica de las comprobaciones de rol al inicio de renderComercialTable()
// (~2061-2066): cuando el rol efectivo (real o impersonado, ver
// getEffectiveRole()) no es admin/marketing, hay que restringir el conjunto
// de filas más allá de lo que ya devuelve RLS — porque RLS filtra por el
// USUARIO AUTENTICADO REAL, no por el rol impersonado. Para un usuario real
// (sin impersonación) esta función es un no-op: RLS ya le devolvió
// exactamente este mismo subconjunto.
export function scopeSolicitudesByRole<T extends { comercial_id: string | null; canal: string | null }>(
  rows: T[],
  perfiles: { id: string; rol: string | null }[],
  rol: string | null | undefined,
  currentUserId: string
): T[] {
  if (rol === "comercial_nacional" || rol === "comercial_exportacion") {
    return rows.filter((s) => s.comercial_id === currentUserId);
  }
  if (rol === "responsable_nacional" || rol === "responsable_exportacion") {
    const canal = rol === "responsable_nacional" ? "nacional" : "exportacion";
    const rolesCanal = ROLES_POR_CANAL[canal];
    const ids = new Set(perfiles.filter((p) => rolesCanal.includes(p.rol ?? "")).map((p) => p.id));
    return rows.filter((s) => (s.comercial_id !== null && ids.has(s.comercial_id)) || s.canal === canal);
  }
  return rows;
}

export function isExportRole(rol: string | null | undefined): boolean {
  return rol === "comercial_exportacion" || rol === "responsable_exportacion";
}

// Réplica de la visibilidad de #filter-comercial-resp (~2020-2029):
// responsables/admin/marketing lo ven; el resto (comerciales rasos), no.
export function muestraFiltroComercial(rol: string | null | undefined): boolean {
  return ["responsable", "responsable_nacional", "responsable_exportacion", "admin", "marketing"].includes(rol ?? "");
}

// Réplica de las opciones de #filter-comercial-resp según el rol
// (~2024-2029): cada responsable de canal solo ve su propio colectivo
// (comercial + responsable del mismo canal); admin/marketing ven los
// comerciales rasos de los 3 canales, pero NO a otros responsables — es un
// colectivo distinto del que usa Panel Global (`comercialesFiltro`).
export function comercialesFiltroMisSolicitudes(perfiles: FormPerfil[], rol: string | null | undefined): FormPerfil[] {
  let roles: string[];
  if (rol === "responsable_nacional") roles = ["comercial_nacional", "responsable_nacional"];
  else if (rol === "responsable_exportacion") roles = ["comercial_exportacion", "responsable_exportacion"];
  else roles = ["comercial", "comercial_nacional", "comercial_exportacion"];
  return perfiles.filter((p) => p.activo && roles.includes(p.rol ?? "")).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export type SolicitudesFilters = { campanaId: string; estado: string; q: string; comercialId: string; idioma: string };

// Réplica del filtro de la tabla (~2067-2074): búsqueda por SAP/empresa,
// filtro de campaña, filtro de estado, filtro de comercial (SOL-26) y
// filtro de idioma solo relevante para exportación (SOL-27) — y ocultar
// 'archivada' cuando no hay filtro de estado explícito.
export function filterSolicitudes(rows: SolicitudListItem[], filters: SolicitudesFilters): SolicitudListItem[] {
  const q = filters.q.trim().toLowerCase();
  return rows.filter((s) => {
    if (filters.campanaId && s.campana_id !== filters.campanaId) return false;
    if (filters.comercialId && s.comercial_id !== filters.comercialId) return false;
    if (filters.idioma && s.idioma?.toUpperCase() !== filters.idioma.toUpperCase()) return false;
    if (q && !s.cod_sap?.toLowerCase().includes(q) && !s.nombre_empresa?.toLowerCase().includes(q)) return false;
    if (filters.estado && s.estado !== filters.estado) return false;
    if (!filters.estado && s.estado === "archivada") return false;
    return true;
  });
}

export type MiniStats = { num: number; lbl: string; cls: "" | "amber" | "blue" | "green" }[];

// Réplica de las mini-stats (~2078-2096): 'Total' excluye archivadas.
export function miniStats(rows: SolicitudListItem[]): MiniStats {
  const total = rows.filter((s) => s.estado !== "archivada").length;
  const pe = (e: string) => rows.filter((s) => s.estado === e).length;
  return [
    { num: total, lbl: "Total", cls: "" },
    { num: pe("borrador"), lbl: "Borrador", cls: "" },
    { num: pe("enviada"), lbl: "Enviadas", cls: "amber" },
    { num: pe("en_revision_marketing"), lbl: "En revisión Mkt.", cls: "" },
    { num: pe("en_diseno") + pe("modificar_diseno"), lbl: "En diseño", cls: "blue" },
    { num: pe("diseno_en_revision_comercial"), lbl: "Revisión cliente", cls: "" },
    { num: pe("confirmada"), lbl: "Completadas ✓", cls: "green" },
  ];
}
