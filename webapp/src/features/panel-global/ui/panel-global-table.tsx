"use client";

import { useMemo, useState } from "react";
import { ALL_CATALOGOS } from "@/shared/domain/catalogos";
import { ESTADO_LABEL } from "@/shared/domain/estados";
import { catSummary } from "@/features/solicitudes/domain/cat-summary";
import { fmtDate } from "@/shared/domain/format";
import type { SolicitudListItem } from "@/features/solicitudes/domain/table";
import type { FormCampana, FormPerfil } from "@/features/solicitudes/domain/types";
import { comercialesFiltro, filterPanelRows, sortPanelRows, type PanelSort } from "../domain/table";
import { missingFields } from "../domain/missing-fields";
import { buildExportRows, buildResumenRows, exportCatalogos, exportFilename, type CampanaCatalogosPorId } from "../domain/export-excel";
import { buildWorkbook } from "../infrastructure/excel-workbook";
import { autoAdjudicar } from "../application/auto-adjudicar.action";
import { campanaBanner } from "@/shared/domain/campanas";

const SORTABLE: { col: string; label: string }[] = [
  { col: "cod_sap", label: "Cód. SAP" },
  { col: "nombre_empresa", label: "Empresa" },
  { col: "comercial", label: "Comercial" },
  { col: "provincia", label: "Provincia" },
];

// Réplica de #page-panel (index.html ~644-693, renderMktTable() ~2192-2249):
// PAN-01 a PAN-06, PAN-13 a PAN-15.
export function PanelGlobalTable({
  rows,
  campanas,
  perfiles,
  defaultCampanaId,
  rol,
  onVer,
  onChanged,
}: {
  rows: SolicitudListItem[];
  campanas: FormCampana[];
  perfiles: FormPerfil[];
  defaultCampanaId: string;
  rol: string | null | undefined;
  onVer: (s: SolicitudListItem) => void;
  onChanged: () => void;
}) {
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [comercialId, setComercialId] = useState("");
  const [provincia, setProvincia] = useState("");
  const [campanaId, setCampanaId] = useState(defaultCampanaId);
  const [sort, setSort] = useState<PanelSort>({ col: "updated_at", dir: "desc" });
  const [adjudicando, setAdjudicando] = useState(false);

  const campanaCatalogosPorId: CampanaCatalogosPorId = useMemo(() => new Map(campanas.map((c) => [c.id, c.catalogos])), [campanas]);

  const filtered = useMemo(
    () => filterPanelRows(rows, { q, estado, comercialId, provincia, campanaId }, rol, perfiles),
    [rows, q, estado, comercialId, provincia, campanaId, rol, perfiles]
  );
  const sorted = useMemo(() => sortPanelRows(filtered, sort, perfiles), [filtered, sort, perfiles]);
  const comerciales = useMemo(() => comercialesFiltro(perfiles), [perfiles]);
  const campanaSeleccionada = campanas.find((c) => c.id === campanaId) ?? null;
  const banner = campanaBanner(campanaSeleccionada);

  function toggleSort(col: string) {
    setSort((prev) => (prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" }));
  }

  function sortIndicator(col: string) {
    if (sort.col !== col) return "↕";
    return sort.dir === "asc" ? "↑" : "↓";
  }

  async function exportarExcel() {
    const cats = exportCatalogos(campanaSeleccionada?.catalogos ?? null);
    const campanaNombre = campanaSeleccionada?.nombre || "Portadas";
    const exportSols = (campanaId ? rows.filter((s) => s.campana_id === campanaId) : rows).filter((s) => s.estado !== "archivada");
    const dataRows = buildExportRows(exportSols, cats, perfiles, campanaCatalogosPorId);
    const fecha = new Date().toISOString().slice(0, 10);
    const resumenRows = buildResumenRows(rows, campanaCatalogosPorId, campanaNombre, fecha);
    const buffer = await buildWorkbook(campanaNombre, cats, dataRows, resumenRows);
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFilename(campanaNombre, fecha);
    a.click();
    URL.revokeObjectURL(url);
  }

  async function ejecutarAutoAdjudicar() {
    const enRevision = rows.filter((s) => s.estado === "en_revision_marketing");
    if (!enRevision.length) {
      alert('No hay solicitudes en estado "En revisión" para adjudicar.');
      return;
    }
    const nombre = campanaSeleccionada?.nombre || "campaña activa";
    if (
      !window.confirm(
        `¿Auto-adjudicar portadas para ${enRevision.length} solicitudes en revisión de ${nombre}?\n\nEl sistema asignará la portada disponible de mayor prioridad para cada cliente, evitando repeticiones por provincia.`
      )
    )
      return;

    setAdjudicando(true);
    const res = await autoAdjudicar();
    setAdjudicando(false);
    if ("error" in res) {
      alert(res.error);
      return;
    }
    const msg = `Auto-adjudicación completada: ${res.adjudicadas} portadas asignadas${res.sinOpciones > 0 ? `, ${res.sinOpciones} sin opción disponible (revisar manualmente)` : ""}.`;
    onChanged();
    if (res.sinOpciones > 0) {
      setTimeout(() => alert(`${msg}\n\nLas solicitudes sin opción disponible necesitan revisión manual — todas sus opciones ya estaban asignadas a otros clientes de la misma provincia.`), 500);
    } else {
      alert(msg);
    }
  }

  return (
    <div>
      {banner && (
        <div className={banner.variant === "cerrada" ? "alert alert-error" : "alert alert-info"} style={{ marginBottom: "1rem" }}>
          {banner.variant === "cerrada" ? "🔒 " : "⚠️ "}
          {banner.mensaje}
        </div>
      )}

      <div className="filter-bar">
        <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar SAP, empresa..." style={{ flex: 1, minWidth: 160 }} />
        <select value={campanaId} onChange={(e) => setCampanaId(e.target.value)} style={{ minWidth: 130 }}>
          <option value="">Todas las campañas</option>
          {campanas
            .filter((c) => c.activa)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
                {c.id === defaultCampanaId ? " ★" : ""}
              </option>
            ))}
        </select>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} style={{ minWidth: 130 }}>
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="enviada">Enviada</option>
          <option value="en_revision_marketing">En revisión</option>
          <option value="en_diseno">En diseño</option>
          <option value="diseno_en_revision_comercial">Revisión cliente</option>
          <option value="modificar_diseno">Modificar diseño</option>
          <option value="confirmada">Confirmada</option>
          <option value="archivada">📁 Archivadas</option>
        </select>
        <select value={comercialId} onChange={(e) => setComercialId(e.target.value)} style={{ minWidth: 130 }}>
          <option value="">Todos los comerciales</option>
          {comerciales.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <input type="text" value={provincia} onChange={(e) => setProvincia(e.target.value)} placeholder="Provincia..." style={{ minWidth: 120 }} />
        <button type="button" className="btn btn-sm" style={{ background: "var(--c-green-l)", color: "var(--c-green)", border: "1px solid var(--c-green)", fontWeight: 600 }} onClick={exportarExcel}>
          ↓ Exportar Excel
        </button>
        <button
          type="button"
          className="btn btn-sm btn-amber"
          disabled={adjudicando}
          title="Asigna automáticamente la portada final a cada cliente según provincia y prioridad"
          onClick={ejecutarAutoAdjudicar}
        >
          ⚡ Auto-adjudicar portadas
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                {SORTABLE.map((s) => (
                  <th key={s.col} onClick={() => toggleSort(s.col)} style={{ cursor: "pointer", userSelect: "none" }}>
                    {s.label} <span>{sortIndicator(s.col)}</span>
                  </th>
                ))}
                {ALL_CATALOGOS.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
                <th onClick={() => toggleSort("estado")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Estado <span>{sortIndicator("estado")}</span>
                </th>
                <th onClick={() => toggleSort("updated_at")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Actualizado <span>{sortIndicator("updated_at")}</span>
                </th>
                <th>Campos incompletos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7 + ALL_CATALOGOS.length}>
                    <div className="empty-state">
                      <div className="icon">📊</div>
                      <p>No hay solicitudes que mostrar.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sorted.map((s) => {
                  const comercial = perfiles.find((p) => p.id === s.comercial_id);
                  const missing = missingFields({
                    provincia: s.provincia,
                    idioma: s.idioma,
                    campana_catalogos: s.campana_id ? campanaCatalogosPorId.get(s.campana_id) ?? null : null,
                    solicitud_catalogos: s.solicitud_catalogos,
                  });
                  return (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.cod_sap}</strong>
                      </td>
                      <td>{s.nombre_empresa || "—"}</td>
                      <td className="text-sm">{comercial?.nombre || "—"}</td>
                      <td>{s.provincia || <span className="text-mid">—</span>}</td>
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
                                  <span className="chip" style={{ background: `${summary.chipColor}20`, color: summary.chipColor, border: `1px solid ${summary.chipColor}40` }}>
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
                      <td className="text-mid text-sm">{fmtDate(s.updated_at)}</td>
                      <td style={{ maxWidth: 180, fontSize: 11, color: "var(--c-red)" }}>
                        {missing.length ? missing.join(", ") : <span style={{ color: "var(--c-green)" }}>✓ Completa</span>}
                      </td>
                      <td>
                        <button type="button" className="btn btn-sm btn-outline" onClick={() => onVer(s)}>
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
