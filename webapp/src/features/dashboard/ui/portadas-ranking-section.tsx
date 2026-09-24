"use client";

import { useState } from "react";
import type { PortadaInvalidaDetalle, CatalogoPortadaStats, PortadaStatsResult } from "../domain/portada-stats";
import { TOP_PORTADAS_N } from "../domain/portada-stats";
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

function CatalogoBarChart({
  cat,
  onModalOpen,
}: {
  cat: CatalogoPortadaStats;
  onModalOpen: (detalle: PortadaInvalidaDetalle[]) => void;
}) {
  const barColor = CAT_COLORS_GENERAL[cat.catalogo] ?? "#888";
  const top5 = cat.ranking.slice(0, TOP_PORTADAS_N);
  const maxTotal = top5[0]?.total ?? 1;

  const hasData =
    top5.length > 0 ||
    cat.disenoPropioCount > 0 ||
    cat.sinAdjudicarCount > 0 ||
    cat.invalidosCount > 0;

  return (
    <div>
      {/* Catalog header */}
      <div
        style={{
          fontWeight: 700,
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          color: barColor,
          marginBottom: "0.75rem",
          paddingBottom: "0.5rem",
          borderBottom: `2px solid ${barColor}`,
        }}
      >
        {cat.label}
      </div>

      {!hasData ? (
        <div style={{ color: "#999", fontSize: 13, padding: "0.25rem 0" }}>
          Sin solicitudes con portada personalizada.
        </div>
      ) : (
        <>
          {top5.length === 0 ? (
            <div style={{ color: "#999", fontSize: 13, marginBottom: "0.5rem" }}>
              Sin portadas adjudicadas.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "0.75rem" }}>
              {top5.map((entry, i) => (
                <div key={entry.portada}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {/* Star / position indicator */}
                    <span
                      style={{
                        width: 14,
                        fontSize: i === 0 ? 13 : 11,
                        color: i === 0 ? "#F59E0B" : "#bbb",
                        textAlign: "center",
                        lineHeight: 1,
                        flexShrink: 0,
                      }}
                      aria-label={i === 0 ? "portada más solicitada" : undefined}
                    >
                      {i === 0 ? "★" : String(i + 1)}
                    </span>
                    {/* Portada name */}
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: i === 0 ? 700 : 400,
                        width: 40,
                        flexShrink: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {entry.portada}
                    </span>
                    {/* Proportional bar */}
                    <div
                      style={{
                        flex: 1,
                        height: i === 0 ? 9 : 7,
                        background: "#F1EFE8",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.round((entry.total / maxTotal) * 100)}%`,
                          height: "100%",
                          background: barColor,
                          borderRadius: 4,
                          opacity: i === 0 ? 1 : 0.55 + (0.3 * (TOP_PORTADAS_N - 1 - i)) / Math.max(TOP_PORTADAS_N - 1, 1),
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                    {/* Count · pct */}
                    <span
                      style={{
                        fontSize: 12,
                        color: "#555",
                        whiteSpace: "nowrap",
                        fontVariantNumeric: "tabular-nums",
                        minWidth: 60,
                        textAlign: "right",
                      }}
                    >
                      {entry.total} · {entry.pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Special counters */}
          {(cat.disenoPropioCount > 0 || cat.sinAdjudicarCount > 0 || cat.invalidosCount > 0) && (
            <div
              style={{
                display: "flex",
                gap: 5,
                flexWrap: "wrap",
                paddingTop: "0.5rem",
                borderTop: "1px solid #F1EFE8",
              }}
            >
              {cat.disenoPropioCount > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    color: "#666",
                    background: "#F5F5F3",
                    padding: "2px 8px",
                    borderRadius: 10,
                  }}
                >
                  Diseño propio: {cat.disenoPropioCount}
                </span>
              )}
              {cat.sinAdjudicarCount > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    color: "#666",
                    background: "#F5F5F3",
                    padding: "2px 8px",
                    borderRadius: 10,
                  }}
                >
                  Sin adjudicar: {cat.sinAdjudicarCount}
                </span>
              )}
              {cat.invalidosCount > 0 && (
                <button
                  onClick={() => onModalOpen(cat.invalidosDetalle)}
                  style={{
                    fontSize: 11,
                    color: "#92400E",
                    background: "#FEF3C7",
                    border: "1px solid #FDE68A",
                    padding: "2px 8px",
                    borderRadius: 10,
                    cursor: "pointer",
                  }}
                >
                  ⚠ Históricos: {cat.invalidosCount}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function PortadasRankingSection({ data }: { data: PortadaStatsResult }) {
  const [modal, setModal] = useState<PortadaInvalidaDetalle[] | null>(null);

  if (data.length === 0) return null;

  return (
    <>
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-title">Portadas más solicitadas</div>

        {/* One chart per catalog, responsive grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {data.map((cat) => (
            <CatalogoBarChart key={cat.catalogo} cat={cat} onModalOpen={setModal} />
          ))}
        </div>
      </div>

      {/* Modal for invalid historical data */}
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
