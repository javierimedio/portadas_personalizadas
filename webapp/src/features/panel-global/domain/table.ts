import type { SolicitudListItem } from "@/features/solicitudes/domain/table";
import type { FormPerfil } from "@/features/solicitudes/domain/types";
import { missingFields } from "./missing-fields";

export type PanelFilters = { q: string; estado: string; comercialId: string; provincia: string; campanaId: string };
export type PanelSort = { col: string; dir: "asc" | "desc" };

// Réplica de renderMktTable() (index.html ~2192-2223): PAN-01 a PAN-05,
// PAN-15. `rol` decide la restricción de responsables a su propio
// colectivo (PAN-01) — el resto de filtros son iguales para todos los
// roles con acceso a esta página (admin/marketing/responsables).
export function filterPanelRows(
  rows: SolicitudListItem[],
  filters: PanelFilters,
  rol: string | null | undefined,
  perfiles: FormPerfil[]
): SolicitudListItem[] {
  let result = filters.campanaId ? rows.filter((s) => s.campana_id === filters.campanaId) : rows;

  if (rol === "responsable_nacional") {
    const ids = new Set(perfiles.filter((p) => p.rol === "comercial_nacional").map((p) => p.id));
    result = result.filter((s) => s.comercial_id !== null && ids.has(s.comercial_id));
  } else if (rol === "responsable_exportacion") {
    const ids = new Set(perfiles.filter((p) => p.rol === "comercial_exportacion").map((p) => p.id));
    result = result.filter((s) => s.comercial_id !== null && ids.has(s.comercial_id));
  }

  const q = filters.q.trim().toLowerCase();
  if (q) {
    result = result.filter((s) => {
      const comercial = perfiles.find((p) => p.id === s.comercial_id);
      return (
        s.cod_sap?.toLowerCase().includes(q) ||
        s.nombre_empresa?.toLowerCase().includes(q) ||
        comercial?.nombre.toLowerCase().includes(q) ||
        false
      );
    });
  }

  if (filters.estado) result = result.filter((s) => s.estado === filters.estado);
  else result = result.filter((s) => s.estado !== "archivada");

  if (filters.comercialId) result = result.filter((s) => s.comercial_id === filters.comercialId);
  if (filters.provincia.trim()) {
    const p = filters.provincia.trim().toLowerCase();
    result = result.filter((s) => s.provincia?.toLowerCase().includes(p));
  }

  return result;
}

// Réplica de sortMkt()/el comparador de renderMktTable() (~2125-2131,
// ~2216-2223): la columna "comercial" ordena por el nombre del perfil
// relacionado, no por el id crudo (PAN-05).
export function sortPanelRows(rows: SolicitudListItem[], sort: PanelSort, perfiles: FormPerfil[]): SolicitudListItem[] {
  const nombreComercial = (s: SolicitudListItem) => perfiles.find((p) => p.id === s.comercial_id)?.nombre ?? "";
  return [...rows].sort((a, b) => {
    let va: string | number = "";
    let vb: string | number = "";
    if (sort.col === "comercial") {
      va = nombreComercial(a);
      vb = nombreComercial(b);
    } else {
      va = (a as unknown as Record<string, string>)[sort.col] ?? "";
      vb = (b as unknown as Record<string, string>)[sort.col] ?? "";
    }
    if (va < vb) return sort.dir === "asc" ? -1 : 1;
    if (va > vb) return sort.dir === "asc" ? 1 : -1;
    return 0;
  });
}

export type PanelStat = { label: string; value: number; className?: "amber" | "blue" | "green" | "red"; color?: string };

// Réplica de renderStats() (~2395-2414): mini-stats del Panel Global,
// filtradas SOLO por la campaña seleccionada (independientes del resto de
// filtros de la tabla — búsqueda/estado/comercial/provincia — igual que el
// original, que las calcula sobre `allSolicitudes`, no sobre las filas ya
// filtradas por `renderMktTable()`). "Incompletas" usa `missingFields()`
// con los catálogos de la campaña de CADA solicitud.
export function panelStats(
  rows: SolicitudListItem[],
  campanaId: string,
  campanaCatalogosPorId: Map<string, string[] | null>
): PanelStat[] {
  const statSols = campanaId ? rows.filter((s) => s.campana_id === campanaId) : rows;
  const activas = statSols.filter((s) => s.estado !== "archivada");
  const total = activas.length;
  const porEstado = (e: string) => activas.filter((s) => s.estado === e).length;
  const completas = activas.filter(
    (s) =>
      missingFields({
        provincia: s.provincia,
        idioma: s.idioma,
        campana_catalogos: s.campana_id ? campanaCatalogosPorId.get(s.campana_id) ?? null : null,
        solicitud_catalogos: s.solicitud_catalogos,
      }).length === 0
  ).length;

  return [
    { label: "Total", value: total },
    { label: "Borrador", value: porEstado("borrador") },
    { label: "Enviadas", value: porEstado("enviada"), className: "amber" },
    { label: "En revisión de Marketing", value: porEstado("en_revision_marketing"), className: "blue" },
    { label: "En diseño", value: porEstado("en_diseno") + porEstado("modificar_diseno"), color: "var(--c-purple)" },
    { label: "En revisión del cliente", value: porEstado("diseno_en_revision_comercial"), color: "var(--c-amber)" },
    { label: "Confirmadas", value: porEstado("confirmada"), className: "green" },
    { label: "Incompletas", value: total - completas, className: "red" },
  ];
}

// Réplica de populateComercialFilter() (~2139-2153): comerciales y
// responsables activos. H-07 (cerrado 2026-08-04): sin los roles legacy
// genéricos `comercial`/`responsable` — no existe ningún usuario real con
// esos roles.
export function comercialesFiltro(perfiles: FormPerfil[]): FormPerfil[] {
  const roles = ["comercial_nacional", "comercial_exportacion", "responsable_nacional", "responsable_exportacion"];
  return perfiles.filter((p) => roles.includes(p.rol ?? "") && p.activo).sort((a, b) => a.nombre.localeCompare(b.nombre));
}
