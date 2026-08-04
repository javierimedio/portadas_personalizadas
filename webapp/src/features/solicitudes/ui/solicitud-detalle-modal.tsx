"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/shared/ui/toast";
import { fmtDate } from "@/shared/domain/format";
import { ESTADO_LABEL } from "@/shared/domain/estados";
import { segmentarComentario } from "../domain/comentarios";
import { accionesDetalle, puedeElegirPortadaFinal } from "../domain/estado-flujo";
import { getSolicitudDetalle, type SolicitudDetalle } from "../application/get-solicitud-detalle";
import {
  addComentario,
  asignarCanalYComercial,
  asignarDisenadorYEnviar,
  cambiarEstado,
  eliminarSolicitud,
  guardarPortadaElegida,
  marcarDisenoListo,
  solicitarModificacion,
} from "../application/detalle-actions";
import type { FormPerfil } from "../domain/types";

const ROLES_POR_CANAL_LOCAL: Record<"nacional" | "exportacion", string[]> = {
  nacional: ["comercial_nacional", "responsable_nacional"],
  exportacion: ["comercial_exportacion", "responsable_exportacion"],
};

// Réplica funcional de #modal-detalle / openDetalle() (index.html
// ~1199-1273, ~3061-3364): vista de solo lectura de catálogos + adjuntos +
// comentarios/historial, más los botones de acción según rol y estado. Sin
// auto-adjudicación de portadas (operación masiva del Panel global, no de
// esta pantalla).
export function SolicitudDetalleModal({
  solicitudId,
  rol,
  perfiles,
  onClose,
  onChanged,
  onEditar,
}: {
  solicitudId: string;
  rol: string | null | undefined;
  perfiles: FormPerfil[];
  onClose: () => void;
  onChanged: () => void;
  onEditar: () => void;
}) {
  const { toast, formAlert } = useToast();
  const [detalle, setDetalle] = useState<SolicitudDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [nuevoComentario, setNuevoComentario] = useState("");

  const [asignarCanalAbierto, setAsignarCanalAbierto] = useState(false);
  const [canal, setCanal] = useState("");
  const [comercialId, setComercialId] = useState("");

  const [asignarDisenadorAbierto, setAsignarDisenadorAbierto] = useState(false);
  const [disenadorId, setDisenadorId] = useState("");

  const [modificacionAbierta, setModificacionAbierta] = useState(false);
  const [comentarioModificacion, setComentarioModificacion] = useState("");
  const [archivoModificacion, setArchivoModificacion] = useState<File | null>(null);
  const modifInputRef = useRef<HTMLInputElement>(null);

  const [disenoFiles, setDisenoFiles] = useState<File[]>([]);
  const disenoInputRef = useRef<HTMLInputElement>(null);
  function addDisenoFiles(newFiles: File[]) {
    if (newFiles.length) setDisenoFiles((prev) => [...prev, ...newFiles]);
  }

  // Réplica de checkMention()/insertMention()/handleCommentKey() (index.html
  // ~4535-4608): dropdown de menciones mientras se escribe.
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const comentarioRef = useRef<HTMLTextAreaElement>(null);

  const mentionMatches = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return perfiles.filter((p) => p.activo && p.nombre.toLowerCase().includes(q)).slice(0, 6);
  }, [perfiles, mentionQuery]);

  function onComentarioChange(value: string, selectionStart: number) {
    setNuevoComentario(value);
    const textBefore = value.slice(0, selectionStart);
    const atMatch = textBefore.match(/@([\w\sáéíóúüñÁÉÍÓÚÜÑ]*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1] ?? "");
      setMentionStartPos(textBefore.lastIndexOf("@"));
    } else {
      setMentionQuery(null);
    }
  }

  function insertMention(nombre: string) {
    const textarea = comentarioRef.current;
    const selectionEnd = textarea?.selectionEnd ?? nuevoComentario.length;
    const before = nuevoComentario.slice(0, mentionStartPos);
    const after = nuevoComentario.slice(selectionEnd);
    const nuevoValor = `${before}@${nombre} ${after}`;
    setNuevoComentario(nuevoValor);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      const pos = `${before}@${nombre} `.length;
      textarea?.focus();
      textarea?.setSelectionRange(pos, pos);
    });
  }

  async function cargar() {
    setLoading(true);
    try {
      const data = await getSolicitudDetalle(solicitudId);
      setDetalle(data);
    } catch {
      formAlert("No se ha podido cargar la solicitud. Inténtalo de nuevo.");
      onClose();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitudId]);

  const acciones = useMemo(() => accionesDetalle(rol, detalle?.estado ?? ""), [rol, detalle?.estado]);
  const comerciales = useMemo(() => {
    if (!canal) return [];
    const roles = ROLES_POR_CANAL_LOCAL[canal as "nacional" | "exportacion"];
    return perfiles.filter((p) => p.activo && roles.includes(p.rol ?? "")).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [perfiles, canal]);
  const disenadores = useMemo(
    () => perfiles.filter((p) => p.activo && (p.rol === "disenador" || p.rol === "responsable_diseno")).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [perfiles]
  );

  async function ejecutarYcerrar(fn: () => Promise<{ error?: string }>, mensaje: string) {
    setBusy(true);
    try {
      const res = await fn();
      if (res.error) {
        formAlert(res.error);
        return;
      }
      toast(mensaje);
      onChanged();
      onClose();
    } catch {
      formAlert("Ha ocurrido un error inesperado. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function ejecutarYrecargar<T extends { error?: string }>(fn: () => Promise<T>, mensaje?: string | ((res: T) => string)) {
    setBusy(true);
    try {
      const res = await fn();
      if (res.error) {
        formAlert(res.error);
        return;
      }
      const texto = typeof mensaje === "function" ? mensaje(res) : mensaje;
      if (texto) toast(texto);
      onChanged();
      await cargar();
    } catch {
      formAlert("Ha ocurrido un error inesperado. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !detalle) {
    return (
      <div className="modal-bg open">
        <div className="modal">
          <div className="modal-header">
            <div className="modal-title">Cargando...</div>
            <button type="button" className="modal-close" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="modal-body" style={{ textAlign: "center", padding: "2rem", color: "var(--c-mid)" }}>
            <div className="loading" style={{ borderTopColor: "var(--c-amber)", width: 24, height: 24, borderWidth: 3, display: "inline-block" }} />
            <p style={{ marginTop: ".75rem", fontSize: 13 }}>Cargando solicitud...</p>
          </div>
        </div>
      </div>
    );
  }

  const detalleId = detalle.id;
  async function enviarComentario() {
    if (!nuevoComentario.trim()) return;
    await ejecutarYrecargar(
      () => addComentario(detalleId, nuevoComentario),
      (res) => (res.mencionados ? `Comentario añadido. ${res.mencionados} mención(es) notificada(s).` : "Comentario añadido.")
    );
    setNuevoComentario("");
  }

  const comentarios = detalle.logs.filter((l) => l.accion === "comentario");
  const historial = detalle.logs.filter((l) => l.accion !== "comentario" && l.accion !== "adjunto");
  const mostrarDisenador = detalle.asignado_id && ["en_diseno", "modificar_diseno", "diseno_en_revision_comercial", "confirmada"].includes(detalle.estado);
  const mostrarSubidaDiseno =
    (rol === "disenador" || rol === "responsable_diseno" || rol === "admin" || rol === "marketing") &&
    (detalle.estado === "en_diseno" || detalle.estado === "modificar_diseno");

  const logosAdjuntos = detalle.adjuntos.filter((a) => a.tipo === "logo_general");
  const disenosAdjuntos = detalle.adjuntos.filter((a) => a.tipo.endsWith("_diseno") || a.tipo === "diseno_portada");
  const otrosAdjuntos = detalle.adjuntos.filter((a) => a !== undefined && !logosAdjuntos.includes(a) && !disenosAdjuntos.includes(a));

  return (
    <div className="modal-bg open">
      <div className="modal" style={{ maxWidth: 900 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Solicitud {detalle.cod_sap}</div>
            <div style={{ fontSize: 12, color: "var(--c-mid)", marginTop: 2 }}>
              {detalle.nombre_empresa || ""} · {detalle.provincia || ""} · {ESTADO_LABEL[detalle.estado] ?? detalle.estado}
              {detalle.campanaNombre ? ` · ${detalle.campanaNombre}` : ""} · ⚙️ {detalle.comercialNombre ?? "—"}
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "1.25rem", alignItems: "start" }}>
            {/* Columna izquierda */}
            <div>
              {detalle.catalogos.map((c) => {
                const canElegir = puedeElegirPortadaFinal(rol, detalle.estado);
                const opciones = [c.portada_opcion_1, c.portada_opcion_2, c.portada_opcion_3].filter(Boolean) as string[];
                const mostrarSelector = c.portada_personalizada && !c.portada_diseno_propio && canElegir && opciones.length > 0;
                return (
                  <div className={`cat-section cat-${c.catalogo}`} key={c.catalogo} style={{ marginBottom: ".75rem" }}>
                    <div className="cat-header" style={{ cursor: "default" }}>
                      <h3>{c.label}</h3>
                      <div style={{ marginLeft: "auto", display: "flex", gap: 8, fontSize: 12, flexWrap: "wrap" }}>
                        <span>
                          Digital: <strong>{c.catalogo_digital === true ? "SI" : c.catalogo_digital === false ? "NO" : "—"}</strong>
                        </span>
                        <span>
                          Impreso: <strong>{c.catalogo_impreso === true ? "SI" : c.catalogo_impreso === false ? "NO" : "—"}</strong>
                        </span>
                        <span>
                          Portada: <strong>{c.portada_personalizada === true ? "SI" : c.portada_personalizada === false ? "NO" : "—"}</strong>
                        </span>
                        {c.hasDisenoProp && c.con_precios !== null && (
                          <span style={{ background: "var(--c-amber-l)", color: "#92400e", padding: "1px 7px", borderRadius: 4, fontWeight: 700 }}>
                            {c.con_precios ? "CON PRECIOS" : "SIN PRECIOS"}
                          </span>
                        )}
                        {c.portada_personalizada && (
                          <span>
                            P1: <strong>{c.portada_diseno_propio ? "Propio" : c.portada_opcion_1 || "—"}</strong>
                          </span>
                        )}
                        {c.portada_personalizada && !c.portada_diseno_propio && (
                          <>
                            <span>
                              P2: <strong>{c.portada_opcion_2 || "—"}</strong>
                            </span>
                            <span>
                              P3: <strong>{c.portada_opcion_3 || "—"}</strong>
                            </span>
                          </>
                        )}
                        {c.portada_personalizada && (
                          <span>
                            Logo: <strong>{c.posicion_logo || "—"}</strong>
                          </span>
                        )}
                        <span>
                          Unds: <strong>{c.unidades || "—"}</strong>
                        </span>
                      </div>
                    </div>
                    {mostrarSelector && (
                      <div style={{ padding: ".5rem 1rem .75rem" }}>
                        <div style={{ background: "var(--c-amber-l)", border: "1px solid var(--c-amber)", borderRadius: 6, padding: "10px 12px" }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--c-amber)", display: "block", marginBottom: 6 }}>
                            ✓ SELECCIONAR PORTADA FINAL
                          </label>
                          <select
                            defaultValue={c.portada_elegida ?? ""}
                            onChange={(e) => ejecutarYrecargar(() => guardarPortadaElegida(detalle.id, c.catalogo, e.target.value), `Portada elegida guardada: ${e.target.value}`)}
                            style={{ width: "100%" }}
                          >
                            <option value="">— selecciona la portada final —</option>
                            {opciones.map((o, i) => (
                              <option key={o} value={o}>
                                {["1ª", "2ª", "3ª"][i]} opción: {o}
                              </option>
                            ))}
                          </select>
                          {c.portada_elegida && (
                            <div style={{ fontSize: 11, color: "var(--c-amber)", marginTop: 6, fontWeight: 600 }}>✓ Elegida: {c.portada_elegida}</div>
                          )}
                        </div>
                      </div>
                    )}
                    {!mostrarSelector && c.portada_elegida && (
                      <div style={{ padding: ".25rem 1rem .5rem" }}>
                        <div style={{ background: "var(--c-green-l)", borderRadius: 4, padding: "5px 10px", fontSize: 12, fontWeight: 600, color: "var(--c-green)" }}>
                          ✓ Portada elegida: {c.portada_elegida}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {detalle.comentarios && (
                <div className="card" style={{ marginBottom: "1rem" }}>
                  <div className="card-title">Comentarios generales</div>
                  <p style={{ fontSize: 13 }}>{detalle.comentarios}</p>
                </div>
              )}

              {detalle.adjuntos.length > 0 && (
                <div className="card" style={{ marginBottom: "1rem" }}>
                  <div className="card-title">Archivos adjuntos ({detalle.adjuntos.length})</div>
                  {[
                    { label: "Logo del cliente", icon: "🏷", color: "var(--c-amber)", items: logosAdjuntos },
                    { label: "Diseños de portada", icon: "🎨", color: "var(--c-purple)", items: disenosAdjuntos },
                    { label: "Otros archivos", icon: "📎", color: "var(--c-mid)", items: otrosAdjuntos },
                  ]
                    .filter((grupo) => grupo.items.length > 0)
                    .map((grupo) => (
                      <div key={grupo.label} style={{ marginBottom: ".75rem" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: grupo.color, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                          <span>{grupo.icon}</span> {grupo.label}
                        </div>
                        {grupo.items.map((a) => (
                          <div key={a.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", borderRadius: 6, background: `${grupo.color}20`, marginBottom: 4 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 500, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.nombre}</div>
                              <div style={{ fontSize: 10, color: "var(--c-mid)", marginTop: 1 }}>
                                {fmtDate(a.created_at)} · {a.subido_por_nombre || ""}
                              </div>
                            </div>
                            <a href={a.url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline" style={{ flexShrink: 0, fontSize: 11 }}>
                              ↗ Ver
                            </a>
                          </div>
                        ))}
                      </div>
                    ))}
                </div>
              )}

              {mostrarSubidaDiseno && (
                <div style={{ borderTop: "1px solid var(--c-line)", marginTop: "1.5rem", paddingTop: "1.25rem" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-mid)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: ".75rem" }}>
                    Subir diseño
                  </div>
                  {/* Réplica de updateDisenoZone()/handleDisenoUpload()/
                      handleDisenoFileInput() (index.html ~5488-5530, DIS-06/
                      DIS-07): arrastrar o hacer clic ACUMULA archivos entre
                      interacciones (no reemplaza), sin botón de eliminación
                      individual — exactamente como en el original. */}
                  <div
                    onClick={() => disenoInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      addDisenoFiles(Array.from(e.dataTransfer.files));
                    }}
                    style={{
                      border: `2px dashed ${disenoFiles.length ? "var(--c-amber)" : "var(--c-line)"}`,
                      background: disenoFiles.length ? "var(--c-amber-l)" : "var(--c-white)",
                      borderRadius: "var(--radius)",
                      padding: "1rem",
                      textAlign: "center",
                      cursor: "pointer",
                    }}
                  >
                    {disenoFiles.length > 0 ? (
                      <div>
                        <div style={{ fontSize: 18, marginBottom: 6 }}>✅</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 6 }}>
                          {disenoFiles.length} archivo{disenoFiles.length > 1 ? "s" : ""} seleccionado{disenoFiles.length > 1 ? "s" : ""}
                        </div>
                        <div style={{ maxHeight: 120, overflowY: "auto", padding: "0 4px" }}>
                          {disenoFiles.map((f, i) => (
                            <div key={`${f.name}-${i}`} style={{ fontSize: 12, color: "#92400e", padding: "2px 0", textAlign: "left" }}>
                              📄 <strong>{f.name}</strong> <span style={{ color: "var(--c-mid)" }}>({(f.size / 1024).toFixed(0)}kb)</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--c-mid)", marginTop: 8 }}>Haz clic o arrastra para añadir más</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>🎨</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--c-dark)" }}>Arrastra el diseño aquí o haz clic</div>
                        <div style={{ fontSize: 11, color: "var(--c-mid)", marginTop: 2 }}>PDF · JPG · PNG · AI · EPS</div>
                      </div>
                    )}
                  </div>
                  <input
                    ref={disenoInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.ai,.eps"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      addDisenoFiles(Array.from(e.target.files ?? []));
                      e.target.value = "";
                    }}
                  />
                </div>
              )}
            </div>

            {/* Columna derecha */}
            <div>
              <div style={{ position: "sticky", top: 8, maxHeight: "calc(90vh - 200px)", overflowY: "auto", paddingRight: 4 }}>
                {mostrarDisenador && (
                  <div style={{ background: "var(--c-purple-l)", border: "1px solid #ddd6fe", borderRadius: 8, padding: ".75rem 1rem", marginBottom: ".75rem", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>🎨</span>
                    <div>
                      <div style={{ fontSize: 11, color: "#6b21a8", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>Diseñador asignado</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{detalle.disenadorNombre ?? "—"}</div>
                    </div>
                  </div>
                )}

                <div className="card" style={{ marginBottom: "1rem" }}>
                  <div className="card-title">Añadir comentario</div>
                  <div style={{ position: "relative" }}>
                    <textarea
                      ref={comentarioRef}
                      value={nuevoComentario}
                      onChange={(e) => onComentarioChange(e.target.value, e.target.selectionStart)}
                      onBlur={() => setTimeout(() => setMentionQuery(null), 150)}
                      onKeyDown={(e) => {
                        if (mentionQuery !== null) {
                          if (e.key === "Escape") {
                            setMentionQuery(null);
                            e.preventDefault();
                          }
                          return;
                        }
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          enviarComentario();
                        }
                      }}
                      placeholder="Escribe un comentario... usa @ para mencionar a alguien"
                      rows={2}
                      style={{ width: "100%", resize: "none" }}
                    />
                    {mentionQuery !== null && mentionMatches.length > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: "100%",
                          left: 0,
                          background: "var(--c-white)",
                          border: "1px solid var(--c-line)",
                          borderRadius: "var(--radius)",
                          boxShadow: "var(--shadow)",
                          width: 240,
                          maxHeight: 180,
                          overflowY: "auto",
                          zIndex: 50,
                        }}
                      >
                        {mentionMatches.map((p) => (
                          <div
                            key={p.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              insertMention(p.nombre);
                            }}
                            style={{ padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 13, borderBottom: "0.5px solid var(--c-line)" }}
                          >
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                background: "var(--c-amber-l)",
                                color: "var(--c-amber)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 11,
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {p.nombre
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 500 }}>{p.nombre}</div>
                              <div style={{ fontSize: 11, color: "var(--c-mid)" }}>{p.rol}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                    <button type="button" className="btn btn-outline btn-sm" disabled={busy || !nuevoComentario.trim()} onClick={enviarComentario}>
                      Añadir
                    </button>
                  </div>
                </div>

                <div className="card" style={{ marginBottom: ".75rem" }}>
                  <div className="card-title">Comentarios{comentarios.length ? ` (${comentarios.length})` : ""}</div>
                  {comentarios.length === 0 ? (
                    <p className="text-mid text-sm" style={{ margin: 0 }}>
                      Sin comentarios aún.
                    </p>
                  ) : (
                    comentarios.map((l) => (
                      <div className="log-entry" key={l.id}>
                        <div className="log-dot" />
                        <div className="log-time">{fmtDate(l.created_at)}</div>
                        <div className="log-text">
                          <strong>{l.usuario_nombre ?? "Sistema"}</strong> — 💬{" "}
                          {segmentarComentario(String(l.detalle?.texto ?? "")).map((seg, i) =>
                            seg.mencion ? (
                              <strong key={i} style={{ color: "var(--c-amber)" }}>
                                {seg.texto}
                              </strong>
                            ) : (
                              <span key={i}>{seg.texto}</span>
                            )
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setHistorialAbierto((v) => !v)}>
                    <div className="card-title" style={{ margin: 0 }}>
                      Historial de cambios
                    </div>
                    <button type="button" className="btn btn-outline btn-sm" style={{ fontSize: 11 }}>
                      {historialAbierto ? "Ocultar" : `Ver historial (${historial.length})`}
                    </button>
                  </div>
                  {historialAbierto && (
                    <div style={{ marginTop: ".75rem" }}>
                      {historial.length === 0 ? (
                        <p className="text-mid text-sm">Sin actividad registrada.</p>
                      ) : (
                        historial.map((l) => (
                          <div className="log-entry" key={l.id}>
                            <div className={`log-dot ${l.accion === "cambio_estado" ? "estado" : ""}`} />
                            <div className="log-time">{fmtDate(l.created_at)}</div>
                            <div className="log-text">
                              <strong>{l.usuario_nombre ?? "Sistema"}</strong> —{" "}
                              {l.accion === "cambio_estado" ? (
                                <>
                                  <span className={`status s-${l.detalle?.estado_anterior}`} style={{ fontSize: 10 }}>
                                    {ESTADO_LABEL[String(l.detalle?.estado_anterior)] ?? String(l.detalle?.estado_anterior)}
                                  </span>{" "}
                                  →{" "}
                                  <span className={`status s-${l.detalle?.estado_nuevo}`} style={{ fontSize: 10 }}>
                                    {ESTADO_LABEL[String(l.detalle?.estado_nuevo)] ?? String(l.detalle?.estado_nuevo)}
                                  </span>
                                </>
                              ) : (
                                l.accion
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sub-paneles de acción */}
          {asignarCanalAbierto && (
            <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--c-line)", paddingTop: "1rem" }}>
              <div className="card-title">Asignar canal y comercial</div>
              <div className="form-grid" style={{ marginBottom: "1rem" }}>
                <div className="form-group">
                  <label>Canal</label>
                  <select
                    value={canal}
                    onChange={(e) => {
                      setCanal(e.target.value);
                      setComercialId("");
                    }}
                  >
                    <option value="">— selecciona canal —</option>
                    <option value="nacional">Nacional</option>
                    <option value="exportacion">Exportación</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Comercial asignado</label>
                  <select value={comercialId} onChange={(e) => setComercialId(e.target.value)}>
                    <option value="">— selecciona comercial —</option>
                    {comerciales.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-outline" onClick={() => setAsignarCanalAbierto(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-amber"
                  disabled={busy}
                  onClick={async () => {
                    await ejecutarYrecargar(() => asignarCanalYComercial(detalle.id, canal, comercialId), "Canal y comercial asignados correctamente.");
                    setAsignarCanalAbierto(false);
                  }}
                >
                  Guardar
                </button>
              </div>
            </div>
          )}

          {asignarDisenadorAbierto && (
            <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--c-line)", paddingTop: "1rem" }}>
              <div className="card-title">Asignar diseñador</div>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <select value={disenadorId} onChange={(e) => setDisenadorId(e.target.value)}>
                  <option value="">— selecciona diseñador —</option>
                  {disenadores.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-outline" onClick={() => setAsignarDisenadorAbierto(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-amber"
                  disabled={busy || !disenadorId}
                  onClick={() => ejecutarYcerrar(() => asignarDisenadorYEnviar(detalle.id, disenadorId), "Diseñador asignado y enviado a diseño.")}
                >
                  Asignar y enviar a diseño
                </button>
              </div>
            </div>
          )}

          {modificacionAbierta && (
            <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--c-line)", paddingTop: "1rem" }}>
              <div className="card-title">Solicitar modificación</div>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label>Comentario</label>
                <textarea
                  value={comentarioModificacion}
                  onChange={(e) => setComentarioModificacion(e.target.value)}
                  placeholder="Explica qué debe cambiarse..."
                  rows={3}
                />
              </div>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label>Adjunto (opcional)</label>
                {/* Réplica de setModifFile() (index.html ~3453-3460, UI-08):
                    previsualización con nombre + tamaño y botón "Quitar". */}
                <div
                  onClick={() => modifInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) setArchivoModificacion(f);
                  }}
                  style={{
                    border: `2px dashed ${archivoModificacion ? "var(--c-green)" : "var(--c-line)"}`,
                    background: archivoModificacion ? "var(--c-green-l)" : "var(--c-white)",
                    borderRadius: "var(--radius)",
                    padding: "0.75rem",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  {archivoModificacion ? (
                    <span>
                      <span style={{ color: "var(--c-green)" }}>✅ {archivoModificacion.name}</span>{" "}
                      <span style={{ color: "var(--c-mid)" }}>({(archivoModificacion.size / 1024).toFixed(0)} KB)</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setArchivoModificacion(null);
                        }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-red)", fontSize: 12, marginLeft: 6 }}
                      >
                        ✕ Quitar
                      </button>
                    </span>
                  ) : (
                    <span style={{ color: "var(--c-mid)" }}>Arrastra un archivo aquí o haz clic</span>
                  )}
                </div>
                <input
                  ref={modifInputRef}
                  type="file"
                  accept=".pdf,.ai,.eps,.svg,.jpg,.jpeg,.png"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setArchivoModificacion(f);
                    e.target.value = "";
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-outline" onClick={() => setModificacionAbierta(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={busy || !comentarioModificacion.trim()}
                  onClick={() => {
                    const fd = new FormData();
                    if (archivoModificacion) fd.set("adjunto", archivoModificacion);
                    ejecutarYcerrar(() => solicitarModificacion(detalle.id, comentarioModificacion, fd), "Modificación solicitada al equipo de diseño.");
                  }}
                >
                  Solicitar modificación
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ flexWrap: "wrap" }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cerrar
          </button>
          {acciones.puedeEditar && (
            <button type="button" className="btn btn-outline btn-sm" onClick={onEditar}>
              ✏️ Editar
            </button>
          )}

          {acciones.puedeEnviarAMarketing && (
            <button type="button" className="btn btn-amber" disabled={busy} onClick={() => ejecutarYcerrar(() => cambiarEstado(detalle.id, "enviada"), "Estado: Enviada")}>
              Enviar a marketing
            </button>
          )}
          {acciones.puedeAsignarCanal && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setAsignarCanalAbierto((v) => !v)}>
              🔀 Asignar canal
            </button>
          )}
          {acciones.puedeAsignarDisenador && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setAsignarDisenadorAbierto((v) => !v)}>
              {detalle.asignado_id ? "🔄 Reasignar diseñador" : "⚙️ Asignar diseñador"}
            </button>
          )}
          {acciones.puedeDevolverABorrador && (
            <button type="button" className="btn btn-outline btn-danger btn-sm" disabled={busy} onClick={() => ejecutarYcerrar(() => cambiarEstado(detalle.id, "borrador"), "Estado: Borrador")}>
              Devolver al comercial
            </button>
          )}
          {acciones.puedeIniciarRevision && (
            <button type="button" className="btn btn-amber" disabled={busy} onClick={() => ejecutarYcerrar(() => cambiarEstado(detalle.id, "en_revision_marketing"), "Estado: En revisión")}>
              Iniciar revisión
            </button>
          )}
          {acciones.puedeEnviarADiseno && (
            <button type="button" className="btn btn-amber" disabled={busy} onClick={() => ejecutarYcerrar(() => cambiarEstado(detalle.id, "en_diseno"), "Estado: En diseño")}>
              Enviar a diseño
            </button>
          )}
          {acciones.puedeMarcarDisenoListo && (
            <button
              type="button"
              className="btn btn-amber btn-sm"
              disabled={busy}
              onClick={() => {
                const fd = new FormData();
                disenoFiles.forEach((f) => fd.append("disenoFiles", f));
                ejecutarYcerrar(() => marcarDisenoListo(detalle.id, fd), "Estado: Revisión cliente");
              }}
            >
              Diseño listo → Revisión cliente
            </button>
          )}
          {acciones.puedeSolicitarModificacion && (
            <button type="button" className="btn btn-outline btn-danger" onClick={() => setModificacionAbierta((v) => !v)}>
              Solicitar modificación
            </button>
          )}
          {acciones.puedeArchivar && (
            <button
              type="button"
              className="btn btn-outline"
              style={{ color: "var(--c-mid)", borderColor: "var(--c-mid)" }}
              disabled={busy}
              onClick={() => {
                if (!window.confirm("¿Archivar esta solicitud?\n\nLas unidades dejarán de contabilizarse en totales y en la exportación Excel, pero la solicitud seguirá visible para consulta.")) return;
                ejecutarYcerrar(() => cambiarEstado(detalle.id, "archivada"), "Solicitud archivada.");
              }}
            >
              📁 Archivar
            </button>
          )}
          {acciones.puedeConfirmar && (
            <button type="button" className="btn btn-green" disabled={busy} onClick={() => ejecutarYcerrar(() => cambiarEstado(detalle.id, "confirmada"), "Estado: Confirmada")}>
              ✓ Confirmar diseño
            </button>
          )}
          {acciones.puedeEliminar && (
            <button
              type="button"
              className="btn btn-outline btn-danger btn-sm"
              style={{ marginLeft: "auto" }}
              disabled={busy}
              onClick={() => {
                if (!window.confirm(`¿Seguro que quieres eliminar la solicitud ${detalle.cod_sap}? Esta acción no se puede deshacer.`)) return;
                ejecutarYcerrar(() => eliminarSolicitud(detalle.id), "Solicitud eliminada.");
              }}
            >
              🗑 Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
