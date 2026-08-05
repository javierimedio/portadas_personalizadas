"use client";

import { useMemo, useRef, useState } from "react";
import { ALL_CATALOGOS } from "@/shared/domain/catalogos";
import { useToast } from "@/shared/ui/toast";
import { useEscapeToClose } from "@/shared/ui/use-escape-to-close";
import { subirArchivo, borrarArchivoSubido } from "@/shared/storage/upload-client";
import type { UploadedFile } from "@/shared/storage/types";
import type { SolicitudListItem } from "@/features/solicitudes/domain/table";
import { matchCargaFile, type CargaMasivaSolicitud } from "../domain/carga-masiva";
import { procesarCargaMasiva } from "../application/procesar-carga-masiva.action";

type Entry = { id: string; nombre: string; size: number; estado: "subiendo" | "ok" | "error"; meta?: UploadedFile };

// Réplica de #modal-carga-masiva (index.html ~5166-5202) y su lista de
// previsualización (~5250-5289): CM-01 a CM-09. La previsualización usa las
// filas ya cargadas en la página de Diseño (equivalente a `allSolicitudes`
// en memoria); el procesamiento real recalcula el emparejamiento en el
// servidor contra el estado actual de la BD.
//
// Arquitectura de subida (docs/09-matriz-paridad-funcional.md §
// "Arquitectura de subida de archivos", 2026-08-04): cada archivo se sube a
// Storage nada más elegirlo (ruta de staging, sin depender de a qué
// solicitud termine perteneciendo) — "Procesar" solo envía la metadata de
// los archivos ya subidos, nunca los binarios.
export function CargaMasivaModal({ rows, onClose, onProcessed }: { rows: SolicitudListItem[]; onClose: () => void; onProcessed: () => void }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [procesando, setProcesando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  useEscapeToClose(onClose);

  const candidatos: CargaMasivaSolicitud[] = useMemo(
    () =>
      rows.map((s) => ({
        id: s.id,
        cod_sap: s.cod_sap,
        nombre_empresa: s.nombre_empresa,
        estado: s.estado,
        solicitud_catalogos: s.solicitud_catalogos.map((c) => ({ catalogo: c.catalogo, portada_personalizada: c.portada_personalizada })),
      })),
    [rows]
  );

  const matches = useMemo(() => entries.map((e) => matchCargaFile(e.nombre, candidatos)), [entries, candidatos]);
  const okCount = matches.filter((m) => m.status === "ok").length;
  const subiendoAlgo = entries.some((e) => e.estado === "subiendo");

  function addFiles(newFiles: File[]) {
    for (const file of newFiles) {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      setEntries((prev) => [...prev, { id, nombre: file.name, size: file.size, estado: "subiendo" }]);
      subirArchivo(file, "diseno/carga-masiva")
        .then((meta) => setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, estado: "ok", meta } : e))))
        .catch(() => setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, estado: "error" } : e))));
    }
  }

  function removeFile(id: string) {
    setEntries((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry?.estado === "ok" && entry.meta) borrarArchivoSubido(entry.meta.path);
      return prev.filter((e) => e.id !== id);
    });
  }

  async function procesar() {
    setProcesando(true);
    const archivos = entries.filter((e) => e.estado === "ok" && e.meta).map((e) => e.meta!);
    const res = await procesarCargaMasiva(archivos);
    setProcesando(false);
    if ("error" in res) {
      toast(res.error);
      return;
    }
    toast(
      `✅ ${res.ok} portada${res.ok !== 1 ? "s" : ""} procesada${res.ok !== 1 ? "s" : ""}.${
        res.errors ? ` ⚠️ ${res.errors} con errores.` : ""
      } Solicitudes enviadas a revisión cliente.`
    );
    if (res.detalles?.length) console.warn("Carga masiva — filas con error", res.detalles);
    onProcessed();
  }

  return (
    <div className="modal-bg open">
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">📦 Carga masiva de portadas</div>
            <div style={{ fontSize: 12, color: "var(--c-mid)", marginTop: 2 }}>
              Nombra los archivos con el código SAP del cliente (ej: <strong>12345.pdf</strong>)
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = "var(--c-amber)";
              e.currentTarget.style.background = "var(--c-amber-l)";
            }}
            onDragLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--c-line)";
              e.currentTarget.style.background = "";
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = "var(--c-line)";
              e.currentTarget.style.background = "";
              addFiles(Array.from(e.dataTransfer.files));
            }}
            style={{
              border: "2px dashed var(--c-line)",
              borderRadius: 8,
              padding: "2rem",
              textAlign: "center",
              cursor: "pointer",
              marginBottom: "1rem",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
            <div style={{ fontWeight: 600 }}>Arrastra los archivos aquí o haz clic</div>
            <div style={{ fontSize: 12, color: "var(--c-mid)", marginTop: 4 }}>
              PDF · JPG · PNG · AI · EPS — Nombra cada archivo con el Código SAP
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.ai,.eps"
            style={{ display: "none" }}
            onChange={(e) => {
              addFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />

          {entries.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-mid)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
                {okCount} de {entries.length} archivos reconocidos
              </div>
              {matches.map((m, i) => {
                const entry = entries[i]!;
                return (
                  <div
                    key={entry.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 0",
                      borderBottom: "1px solid var(--c-line)",
                      fontSize: 12,
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      <button
                        type="button"
                        onClick={() => removeFile(entry.id)}
                        style={{ border: "none", background: "none", cursor: "pointer", color: "var(--c-mid)", fontSize: 14, padding: 0, flexShrink: 0 }}
                      >
                        ✕
                      </button>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        📄 <strong>{m.fileName}</strong>
                      </span>
                    </div>
                    {entry.estado === "subiendo" && <span style={{ color: "var(--c-mid)", flexShrink: 0 }}>⏳ Subiendo...</span>}
                    {entry.estado === "error" && <span style={{ color: "var(--c-red)", flexShrink: 0 }}>⚠️ Error al subir</span>}
                    {entry.estado === "ok" && m.status === "ok" && (
                      <span style={{ color: "#15803d", fontWeight: 600, flexShrink: 0 }}>
                        ✅ {m.nombreEmpresa} · {m.catKey ? ALL_CATALOGOS.find((c) => c.key === m.catKey)?.label ?? m.catKey : "todos los catálogos"}
                      </span>
                    )}
                    {entry.estado === "ok" && m.status === "notfound" && (
                      <span style={{ color: "#dc2626", flexShrink: 0 }}>❌ SAP {m.sap} no encontrado en diseño</span>
                    )}
                    {entry.estado === "ok" && m.status === "nocatalog" && (
                      <span style={{ color: "#d97706", flexShrink: 0 }}>
                        ⚠️ {m.nombreEmpresa} — catálogo {m.catKey} sin portada personalizada
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="btn btn-amber" disabled={okCount === 0 || subiendoAlgo || procesando} onClick={procesar}>
              {subiendoAlgo ? "Subiendo..." : procesando ? "Procesando..." : `Procesar ${okCount} portada${okCount !== 1 ? "s" : ""} → Revisión cliente`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
