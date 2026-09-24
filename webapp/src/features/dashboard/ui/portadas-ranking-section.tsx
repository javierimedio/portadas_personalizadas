"use client";

import { useState } from "react";
import type { PortadaInvalidaDetalle, PortadaStatsResult } from "../domain/portada-stats";
import { CAT_COLORS_GENERAL } from "../domain/dashboard-stats";

const ESTADO_LABEL: Record<string, string> = {
  enviada: "Enviada",
  en_revision_marketing: "En revisión",
  en_diseno: "En diseño",
  pendiente_comercial: "Pendiente comercial",
  diseno_en_revision_comercial: "Revisión cliente",
  modificar_diseno: "Modificar diseño",
  confirmada: "Confirmada",
};

function etiquetaEstado(estado: string): string {
  return ESTADO_LABEL[estado] ?? estado;
}

export function PortadasRankingSection({ data }: { data: PortadaStatsResult }) {
  const [activeTab, setActiveTab] = useState(data[0]?.catalogo ?? "");
  const [modal, setModal] = useState<PortadaInvalidaDetalle[] | null>(null);

  if (data.length === 0) return null;

  const current = data.find((d) => d.catalogo === activeTab) ?? data[0];
  if (!current) return null;

  const barColor = CAT_COLORS_GENERAL[current.catalogo] ?? "#888";
  const hasAnyData =
    current.totalValidas > 0 ||
    current.disenoPropioCount > 0 ||
    current.sinAdjudicarCount > 0 ||
    current.invalidosCount > 0;

  return (
    <>
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-title">Portadas más solicitadas</div>

        {/* Tabs por catálogo */}
        <div style={{ display: "flex", gap: 4, marginBottom: "1rem", flexWrap: "wrap" }}>
          {data.map((cat) => {
            const isActive = cat.catalogo === (current?.catalogo ?? "");
            return (
              <button
                key={cat.catalogo}
                onClick={() => setActiveTab(cat.catalogo)}
                style={{
                  padding: "5px 14px",
                  borderRadius: 20,
                  border: isActive
                    ? `2px solid ${CAT_COLORS_GENERAL[cat.catalogo] ?? "#888"}`
                    : "2px solid #e5e5e5",
                  background: isActive ? CAT_COLORS_GENERAL[cat.catalogo] ?? "#888" : "transparent",
                  color: isActive ? "#fff" : "#555",
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Contenido de la pestaña activa */}
        {!hasAnyData ? (
          <div style={{ color: "#999", fontSize: 14, padding: "1rem 0" }}>
            Sin solicitudes con portada personalizada para este catálogo.
          </div>
        ) : (
          <>
            {/* Ranking */}
            {current.ranking.length === 0 ? (
              <div style={{ color: "#999", fontSize: 14, marginBottom: "1rem" }}>
                Sin portadas adjudicadas válidas.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "1rem" }}>
                {current.ranking.map((entry, i) => (
                  <div key={entry.portada}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 4,
                        fontSize: 14,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: i === 0 ? 700 : 400,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {i === 0 && (
                          <span style={{ color: "#F59E0B", fontSize: 15 }} aria-label="portada más solicitada">
                            ★
                          </span>
                        )}
                        {entry.portada}
                      </span>
                      <span style={{ color: "#555", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
                        {entry.total} solicitud{entry.total !== 1 ? "es" : ""} · {entry.pct}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        background: "#F1EFE8",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${entry.pct}%`,
                          height: "100%",
                          background: barColor,
                          borderRadius: 4,
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Contadores secundarios */}
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                paddingTop: "0.75rem",
                borderTop: "1px solid #F1EFE8",
              }}
            >
              {current.disenoPropioCount > 0 && (
                <span
                  style={{
                    fontSize: 12,
                    color: "#666",
                    background: "#F5F5F3",
                    padding: "3px 10px",
                    borderRadius: 12,
                  }}
                >
                  Diseño propio: {current.disenoPropioCount}
                </span>
              )}
              {current.sinAdjudicarCount > 0 && (
                <span
                  style={{
                    fontSize: 12,
                    color: "#666",
                    background: "#F5F5F3",
                    padding: "3px 10px",
                    borderRadius: 12,
                  }}
                >
                  Sin adjudicar: {current.sinAdjudicarCount}
                </span>
              )}
              {current.invalidosCount > 0 && (
                <button
                  onClick={() => setModal(current.invalidosDetalle)}
                  style={{
                    fontSize: 12,
                    color: "#92400E",
                    background: "#FEF3C7",
                    border: "1px solid #FDE68A",
                    padding: "3px 10px",
                    borderRadius: 12,
                    cursor: "pointer",
                  }}
                >
                  ⚠ Datos históricos: {current.invalidosCount}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal de datos históricos inválidos */}
      {modal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => setModal(null)}
        >
          <div
            style={{
              background: "var(--card-bg, #fff)",
              borderRadius: 10,
              padding: "1.5rem",
              maxWidth: 680,
              width: "100%",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}
            >
              <strong style={{ fontSize: 16 }}>Datos históricos inválidos</strong>
              <button
                onClick={() => setModal(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 20,
                  color: "#888",
                  lineHeight: 1,
                  padding: 4,
                }}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: 13, color: "#666", marginBottom: "1rem", lineHeight: 1.5 }}>
              Estos valores de <code>portada_elegida</code> tienen el formato de un nombre de
              archivo generado por la carga masiva legacy y han sido excluidos del ranking.
              No representan adjudicaciones válidas.
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #E5E7EB" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: "#374151" }}>Cód. SAP</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: "#374151" }}>Catálogo</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: "#374151" }}>Valor detectado</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: "#374151" }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {modal.map((row, i) => (
                  <tr
                    key={`${row.solicitudId}-${row.catalogo}-${i}`}
                    style={{ borderBottom: "1px solid #F3F4F6" }}
                  >
                    <td style={{ padding: "7px 8px" }}>{row.codSap ?? "—"}</td>
                    <td style={{ padding: "7px 8px" }}>{row.catalogo.toUpperCase().replace("_", " ")}</td>
                    <td
                      style={{
                        padding: "7px 8px",
                        fontFamily: "monospace",
                        fontSize: 12,
                        color: "#92400E",
                      }}
                    >
                      {row.portadaElegida}
                    </td>
                    <td style={{ padding: "7px 8px", color: "#555" }}>
                      {etiquetaEstado(row.estado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
