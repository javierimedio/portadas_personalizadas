"use client";

import { useMemo, useState } from "react";
import { fmtDate } from "@/shared/domain/format";
import { ALL_CATALOGOS } from "@/shared/domain/catalogos";
import { ESTADO_LABEL } from "@/shared/domain/estados";
import { IDIOMAS } from "@/shared/domain/idiomas";
import { catSummary } from "../domain/cat-summary";
import {
  comercialesFiltroMisSolicitudes,
  filterSolicitudes,
  isExportRole,
  miniStats,
  muestraFiltroComercial,
  type SolicitudListItem,
} from "../domain/table";
import type { FormPerfil } from "../domain/types";

const IDIOMAS_FILTRO = [...IDIOMAS].sort((a, b) => a.localeCompare(b, "es"));

// Réplica de #page-mis-solicitudes (index.html ~578-642) y
// renderComercialTable() (~2012-2121).
export function SolicitudesTable({
  rows,
  campanas,
  perfiles,
  defaultCampanaId,
  rol,
  onNueva,
  onEditar,
  onVer,
}: {
  rows: SolicitudListItem[];
  campanas: { id: string; nombre: string; activa: boolean }[];
  perfiles: FormPerfil[];
  defaultCampanaId: string;
  rol: string | null | undefined;
  onNueva: () => void;
  onEditar: (solicitud: SolicitudListItem) => void;
  onVer: (solicitud: SolicitudListItem) => void;
}) {
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [campanaId, setCampanaId] = useState(defaultCampanaId);
  const [comercialId, setComercialId] = useState("");
  const [idioma, setIdioma] = useState("");

  const isExport = isExportRole(rol);
  const muestraComercial = muestraFiltroComercial(rol);
  const comerciales = useMemo(() => comercialesFiltroMisSolicitudes(perfiles, rol), [perfiles, rol]);
  const filtered = useMemo(
    () => filterSolicitudes(rows, { campanaId, estado, q, comercialId: muestraComercial ? comercialId : "", idioma: isExport ? idioma : "" }),
    [rows, campanaId, estado, q, comercialId, muestraComercial, idioma, isExport]
  );
  const stats = useMemo(() => miniStats(filtered), [filtered]);
  const nombreCampana = (id: string | null) => campanas.find((c) => c.id === id)?.nombre ?? "";

  return (
    <div>
      <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        {stats.map((s) => (
          <div key={s.lbl} className={`stat-card ${s.cls}`} style={{ flex: 1, minWidth: 90, padding: ".75rem 1rem" }}>
            <div className="stat-num" style={{ fontSize: "1.5rem" }}>
              {s.num}
            </div>
            <div className="stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
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
        {muestraComercial && (
          <select value={comercialId} onChange={(e) => setComercialId(e.target.value)} style={{ fontSize: 13, minWidth: 160 }}>
            <option value="">Todos los comerciales</option>
            {comerciales.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        )}
        {isExport && (
          <select value={idioma} onChange={(e) => setIdioma(e.target.value)} style={{ fontSize: 13, minWidth: 150 }}>
            <option value="">Todos los idiomas</option>
            {IDIOMAS_FILTRO.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        )}
        <button type="button" onClick={onNueva} className="btn btn-amber">
          + Nueva solicitud
        </button>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por código SAP..."
          style={{ flex: 1, minWidth: 200 }}
        />
        <select value={estado} onChange={(e) => setEstado(e.target.value)} style={{ fontSize: 13, minWidth: 150 }}>
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
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Cód. SAP</th>
                <th>Empresa</th>
                <th>{isExport ? "Idioma" : "Provincia"}</th>
                {ALL_CATALOGOS.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
                <th>Estado</th>
                <th>Actualizado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6 + ALL_CATALOGOS.length}>
                    <div className="empty-state">
                      <div className="icon">📋</div>
                      <p>Aún no has creado ninguna solicitud.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.cod_sap}</strong>
                    </td>
                    <td>
                      {s.nombre_empresa || "—"}
                      {s.campana_id !== defaultCampanaId && (
                        <span
                          style={{
                            fontSize: 10,
                            background: "var(--c-amber-l)",
                            color: "var(--c-amber)",
                            padding: "1px 5px",
                            borderRadius: 4,
                            marginLeft: 4,
                          }}
                        >
                          {nombreCampana(s.campana_id)}
                        </span>
                      )}
                    </td>
                    <td>
                      {(isExport ? s.idioma : s.provincia) || <span className="text-mid">—</span>}
                    </td>
                    {ALL_CATALOGOS.map((catDef) => {
                      const summary = catSummary(
                        s.solicitud_catalogos.find((c) => c.catalogo === catDef.key),
                        catDef
                      );
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
                    <td className="text-mid text-sm">{fmtDate(s.updated_at)}</td>
                    <td>
                      <div className="gap-8">
                        {s.estado === "borrador" && (
                          <button type="button" onClick={() => onEditar(s)} className="btn btn-sm btn-outline">
                            Editar
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
    </div>
  );
}
