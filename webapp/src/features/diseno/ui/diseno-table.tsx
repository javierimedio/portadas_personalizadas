"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ALL_CATALOGOS } from "@/shared/domain/catalogos";
import { ESTADO_LABEL } from "@/shared/domain/estados";
import { catSummary } from "@/features/solicitudes/domain/cat-summary";
import type { SolicitudListItem } from "@/features/solicitudes/domain/table";
import type { FormPerfil } from "@/features/solicitudes/domain/types";
import { DISENO_ROLES } from "@/features/solicitudes/domain/estado-flujo";
import { reasignarDisenador } from "@/features/solicitudes/application/detalle-actions";
import {
  disenadorStats,
  disenadoresActivos,
  filterDisenoTareas,
  sortDisenoTareas,
  ROLES_FILTRO_DISENADOR_VISIBLE,
  UNASSIGNED_DISENADOR,
  parseUrlState,
  buildUrlState,
  type DisenoUrlState,
  type SortField,
} from "../domain/table";
import { buildDisenoCsv, disenoCsvFilename, filasParaCsv } from "../domain/csv";
import { fmtDate } from "@/shared/domain/format";

const PAGE_SIZE = 25;

// Returns true when a click or keyboard event originates on an interactive
// element — the row's own action should then take precedence over opening
// the detail modal. Tests import this to verify the delegation logic.
export function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  return !!target.closest("button, a, input, select, textarea");
}

export function shouldOpenOnKey(key: string): boolean {
  return key === "Enter" || key === " ";
}

const KPI_COLOR = {
  pendientes: "var(--c-red)",    // modificar_diseno: devueltas para corrección
  enDiseno: "var(--c-amber)",    // en_diseno: diseño inicial en curso
  mandadas: "var(--c-blue)",
  aprobadas: "var(--c-green)",
} as const;

function KpiCell({
  value,
  label,
  color,
  borderRight,
  borderBottom,
}: {
  value: number;
  label: string;
  color: string;
  borderRight?: boolean;
  borderBottom?: boolean;
}) {
  return (
    <div
      style={{
        padding: "10px 8px 9px",
        textAlign: "center",
        borderRight: borderRight ? "1px solid var(--c-line)" : undefined,
        borderBottom: borderBottom ? "1px solid var(--c-line)" : undefined,
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 800, color: value > 0 ? color : "var(--c-mid)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--c-mid)", textTransform: "uppercase", letterSpacing: ".05em", marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

// Réplica de #page-diseno (index.html ~696-720) y renderDisenoTable()
// (~2244-2306): la cola de trabajo de diseño (DIS-01 a DIS-05, DIS-09,
// DIS-10). La zona de subida/acumulación de archivos y "Diseño listo"
// (DIS-06 a DIS-08) ya viven en SolicitudDetalleModal desde el bloque de
// flujo de estados — "Ver" abre ese mismo modal.
export function DisenoTable({
  rows,
  campanas,
  perfiles,
  defaultCampanaId,
  rol,
  currentUserId,
  onVer,
  onCargaMasiva,
}: {
  rows: SolicitudListItem[];
  campanas: { id: string; nombre: string; activa: boolean }[];
  perfiles: FormPerfil[];
  defaultCampanaId: string;
  rol: string | null | undefined;
  currentUserId: string | null | undefined;
  onVer: (solicitud: SolicitudListItem) => void;
  onCargaMasiva: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlState = parseUrlState(searchParams);
  const { q, disenadorId, estado, sort, page } = urlState;

  // campanaId stays local — not persisted in URL
  const [campanaId, setCampanaId] = useState(defaultCampanaId);
  const [autoAssignBusy, setAutoAssignBusy] = useState<string | null>(null);

  function navigate(updates: Partial<DisenoUrlState>) {
    const next = { ...urlState, ...updates };
    const params = buildUrlState(next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function handleFilterChange(updates: Partial<DisenoUrlState>) {
    navigate({ ...updates, page: 1 });
  }

  function handleSort(field: SortField) {
    const newDir = sort.field === field ? (sort.dir === "asc" ? "desc" : "asc") : "asc";
    navigate({ sort: { field, dir: newDir } });
  }

  const puedeAutoAsignar = currentUserId !== null && currentUserId !== undefined && (DISENO_ROLES as readonly string[]).includes(rol ?? "");

  async function handleAutoAssign(solicitudId: string) {
    if (!currentUserId) return;
    setAutoAssignBusy(solicitudId);
    try {
      const res = await reasignarDisenador(solicitudId, currentUserId);
      if (!res.error) router.refresh();
    } finally {
      setAutoAssignBusy(null);
    }
  }

  const filtered = useMemo(
    () => filterDisenoTareas(rows, { campanaId, disenadorId, q, estado }),
    [rows, campanaId, disenadorId, q, estado]
  );
  const sorted = useMemo(() => sortDisenoTareas(filtered, sort, perfiles), [filtered, sort, perfiles]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Las KPIs se calculan sobre rows completos (filtrados por campaña/diseñador,
  // pero no por la búsqueda SAP ni por el filtro "Sin asignar") para reflejar
  // el estado real de la campaña.
  const statsDisenadorId = disenadorId && disenadorId !== UNASSIGNED_DISENADOR ? disenadorId : undefined;
  const stats = useMemo(
    () => disenadorStats(rows, perfiles, campanaId, statsDisenadorId),
    [rows, perfiles, campanaId, statsDisenadorId]
  );
  const disenadores = useMemo(() => disenadoresActivos(perfiles), [perfiles]);
  const mostrarFiltroDisenador = ROLES_FILTRO_DISENADOR_VISIBLE.includes(rol ?? "");
  const nombreDisenador = (id: string | null) => perfiles.find((p) => p.id === id)?.nombre ?? "—";

  function exportarCsv() {
    const filas = filasParaCsv(rows, campanaId, rol, currentUserId);
    const csv = buildDisenoCsv(filas);
    const nombreCampana = campanas.find((c) => c.id === campanaId)?.nombre;
    const filename = disenoCsvFilename(nombreCampana, new Date().toISOString().slice(0, 10));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const sortTh = (label: string, field: SortField) => (
    <th onClick={() => handleSort(field)} style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
      {label}{" "}
      <span style={{ color: sort.field === field ? "var(--c-dark)" : "var(--c-mid)", fontSize: 10 }}>
        {sort.field === field ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </th>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div className="section-title">Diseño</div>
          <div className="section-sub">Solicitudes en proceso de diseño.</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={exportarCsv} className="btn btn-sm" style={{ background: "var(--c-blue)", color: "white", border: "none" }}>
            ⬇ Exportar CSV
          </button>
          <button type="button" onClick={onCargaMasiva} className="btn btn-sm" style={{ background: "var(--c-amber)", color: "white", border: "none" }}>
            📦 Carga masiva
          </button>
          <select value={estado} onChange={(e) => handleFilterChange({ estado: e.target.value })} style={{ fontSize: 13, minWidth: 180 }}>
            <option value="">Todos los estados</option>
            <option value="en_diseno">{ESTADO_LABEL["en_diseno"] ?? "En diseño"}</option>
            <option value="modificar_diseno">{ESTADO_LABEL["modificar_diseno"] ?? "Modificar diseño"}</option>
            <option value="diseno_en_revision_comercial">{ESTADO_LABEL["diseno_en_revision_comercial"] ?? "En revisión comercial"}</option>
          </select>
          <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 13 13"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ position: "absolute", left: 8, pointerEvents: "none" }}
              aria-hidden="true"
            >
              <circle cx="5.5" cy="5.5" r="4" stroke="var(--c-mid)" strokeWidth="1.4" />
              <path d="M9 9L11.5 11.5" stroke="var(--c-mid)" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder="Buscar por SAP"
              value={q}
              onChange={(e) => handleFilterChange({ q: e.target.value })}
              style={{
                fontSize: 13,
                width: 220,
                padding: "0.4rem 0.75rem 0.4rem 1.75rem",
                border: "1px solid var(--c-line)",
                borderRadius: "var(--radius)",
                background: "var(--c-white)",
                color: "var(--c-dark)",
                fontFamily: "inherit",
              }}
            />
          </div>
          {mostrarFiltroDisenador && (
            <select value={disenadorId} onChange={(e) => handleFilterChange({ disenadorId: e.target.value })} style={{ fontSize: 13, minWidth: 160 }}>
              <option value="">Todos los diseñadores</option>
              <option value={UNASSIGNED_DISENADOR}>Sin diseñador asignado</option>
              {disenadores.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {stats.length > 0 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: "1.25rem" }}>
          {stats.map((s) => (
            <div
              key={s.id}
              style={{
                background: "var(--c-white)",
                border: "1px solid var(--c-line)",
                borderRadius: "var(--radius)",
                boxShadow: "var(--shadow)",
                minWidth: 188,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "7px 12px 6px",
                  borderBottom: "1px solid var(--c-line)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--c-dark)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {s.nombre}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                <KpiCell value={s.pendientes} label="Pendientes" color={KPI_COLOR.pendientes} borderRight borderBottom />
                <KpiCell value={s.enDiseno} label="En diseño" color={KPI_COLOR.enDiseno} borderBottom />
                <KpiCell value={s.mandadas} label="Mandadas" color={KPI_COLOR.mandadas} borderRight />
                <KpiCell value={s.aprobadas} label="Aprobadas" color={KPI_COLOR.aprobadas} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                {sortTh("Cód. SAP", "cod_sap")}
                {sortTh("Empresa", "nombre_empresa")}
                {sortTh("Provincia", "provincia")}
                {ALL_CATALOGOS.map((c) =>
                  c.key === "roly" ? sortTh(c.label, "roly") : <th key={c.key}>{c.label}</th>
                )}
                {sortTh("Estado", "estado")}
                {sortTh("Fecha", "fecha")}
                {sortTh("Diseñador", "disenador")}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={7 + ALL_CATALOGOS.length}>
                    <div className="empty-state">
                      <div className="icon">🎨</div>
                      <p>No hay solicitudes asignadas.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((s) => (
                  <tr
                    key={s.id}
                    tabIndex={0}
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                      if (isInteractiveTarget(e.target)) return;
                      onVer(s);
                    }}
                    onKeyDown={(e) => {
                      if (shouldOpenOnKey(e.key)) {
                        e.preventDefault();
                        onVer(s);
                      }
                    }}
                  >
                    <td>
                      <strong>{s.cod_sap}</strong>
                    </td>
                    <td>{s.nombre_empresa || "—"}</td>
                    <td>{s.provincia || "—"}</td>
                    {ALL_CATALOGOS.map((catDef) => {
                      const summary = catSummary(s.solicitud_catalogos.find((c) => c.catalogo === catDef.key), catDef);
                      return (
                        <td key={catDef.key}>
                          {summary.variant === "empty" && <span className="text-mid">—</span>}
                          {summary.variant === "no" && <span className="text-mid">No</span>}
                          {summary.variant === "summary" && (
                            <span style={{ fontSize: 11 }}>
                              {summary.unidades ?? "—"} uds{" "}
                              {summary.portadaLabel && (
                                <span
                                  className="chip"
                                  style={{
                                    background: `${summary.chipColor}20`,
                                    color: summary.chipColor,
                                    border: `1px solid ${summary.chipColor}40`,
                                  }}
                                >
                                  {summary.portadaLabel}
                                </span>
                              )}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td>
                      <span className={`status s-${s.estado}`}>{ESTADO_LABEL[s.estado] ?? s.estado}</span>
                    </td>
                    <td className="text-mid text-sm">{fmtDate(s.enviada_at ?? s.updated_at)}</td>
                    <td style={{ fontSize: 12, color: "var(--c-mid)" }}>{nombreDisenador(s.asignado_id)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "nowrap" }}>
                        {puedeAutoAsignar && s.asignado_id !== currentUserId && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            style={{ color: "var(--c-amber)", borderColor: "var(--c-amber)" }}
                            disabled={autoAssignBusy === s.id}
                            onClick={() => handleAutoAssign(s.id)}
                          >
                            {autoAssignBusy === s.id ? "..." : "Asignarme"}
                          </button>
                        )}
                        <button type="button" onClick={() => onVer(s)} className="btn btn-sm btn-outline">
                          Ver
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: "1rem", fontSize: 13 }}>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            disabled={safePage <= 1}
            onClick={() => navigate({ page: safePage - 1 })}
          >
            ← Anterior
          </button>
          <span style={{ color: "var(--c-mid)" }}>
            Página {safePage} de {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            disabled={safePage >= totalPages}
            onClick={() => navigate({ page: safePage + 1 })}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
