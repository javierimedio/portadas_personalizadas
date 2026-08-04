"use client";

import { useMemo, useState } from "react";
import { ALL_CATALOGOS } from "@/shared/domain/catalogos";
import { ESTADO_LABEL } from "@/shared/domain/estados";
import { catSummary } from "@/features/solicitudes/domain/cat-summary";
import type { SolicitudListItem } from "@/features/solicitudes/domain/table";
import type { FormPerfil } from "@/features/solicitudes/domain/types";
import { disenadorStats, disenadoresActivos, filterDisenoTareas, ROLES_FILTRO_DISENADOR_VISIBLE } from "../domain/table";
import { buildDisenoCsv, disenoCsvFilename, filasParaCsv } from "../domain/csv";

const STAT_COLOR: Record<string, string> = { mid: "var(--c-mid)", red: "var(--c-red)", green: "var(--c-green)" };

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
  const [campanaId, setCampanaId] = useState(defaultCampanaId);
  const [disenadorId, setDisenadorId] = useState("");

  const filtered = useMemo(() => filterDisenoTareas(rows, { campanaId, disenadorId }), [rows, campanaId, disenadorId]);
  const stats = useMemo(() => disenadorStats(filtered, perfiles), [filtered, perfiles]);
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

  return (
    <div>
      {stats.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "1rem" }}>
          {stats.map((s) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                background: "white",
                borderRadius: 8,
                border: "1px solid var(--c-line)",
              }}
            >
              <span style={{ fontSize: 20, fontWeight: 800, color: STAT_COLOR[s.color] }}>{s.count}</span>
              <span style={{ fontSize: 12, color: "var(--c-dark)", fontWeight: 500 }}>{s.nombre.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      )}

      <div className="filter-bar">
        <button type="button" onClick={exportarCsv} className="btn btn-sm" style={{ background: "var(--c-blue)", color: "white", border: "none" }}>
          ⬇ Exportar CSV
        </button>
        <button type="button" onClick={onCargaMasiva} className="btn btn-sm" style={{ background: "var(--c-amber)", color: "white", border: "none" }}>
          📦 Carga masiva
        </button>
        {mostrarFiltroDisenador && (
          <select value={disenadorId} onChange={(e) => setDisenadorId(e.target.value)} style={{ fontSize: 13, minWidth: 160 }}>
            <option value="">Todos los diseñadores</option>
            {disenadores.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </select>
        )}
        <select value={campanaId} onChange={(e) => setCampanaId(e.target.value)} style={{ fontSize: 13, minWidth: 160 }}>
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
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Cód. SAP</th>
                <th>Empresa</th>
                <th>Provincia</th>
                {ALL_CATALOGOS.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
                <th>Estado</th>
                <th>Diseñador</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6 + ALL_CATALOGOS.length}>
                    <div className="empty-state">
                      <div className="icon">🎨</div>
                      <p>No hay solicitudes asignadas.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id}>
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
                    <td style={{ fontSize: 12, color: "var(--c-mid)" }}>{nombreDisenador(s.asignado_id)}</td>
                    <td>
                      <button type="button" onClick={() => onVer(s)} className="btn btn-sm btn-outline">
                        Ver
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
