"use client";

import { useMemo, useRef, useState } from "react";
import { ALL_CATALOGOS } from "@/shared/domain/catalogos";
import { useToast } from "@/shared/ui/toast";
import type { SolicitudListItem } from "@/features/solicitudes/domain/table";
import { matchCargaFile, type CargaMasivaSolicitud } from "../domain/carga-masiva";
import { procesarCargaMasiva } from "../application/procesar-carga-masiva.action";

// Réplica de #modal-carga-masiva (index.html ~5166-5202) y su lista de
// previsualización (~5250-5289): CM-01 a CM-09. La previsualización usa las
// filas ya cargadas en la página de Diseño (equivalente a `allSolicitudes`
// en memoria); el procesamiento real recalcula el emparejamiento en el
// servidor contra el estado actual de la BD.
export function CargaMasivaModal({ rows, onClose, onProcessed }: { rows: SolicitudListItem[]; onClose: () => void; onProcessed: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [procesando, setProcesando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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

  const matches = useMemo(() => files.map((f) => matchCargaFile(f.name, candidatos)), [files, candidatos]);
  const okCount = matches.filter((m) => m.status === "ok").length;

  function addFiles(newFiles: File[]) {
    if (newFiles.length) setFiles((prev) => [...prev, ...newFiles]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function procesar() {
    setProcesando(true);
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    const res = await procesarCargaMasiva(fd);
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

          {files.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-mid)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
                {okCount} de {files.length} archivos reconocidos
              </div>
              {matches.map((m, i) => (
                <div
                  key={`${m.fileName}-${i}`}
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
                      onClick={() => removeFile(i)}
                      style={{ border: "none", background: "none", cursor: "pointer", color: "var(--c-mid)", fontSize: 14, padding: 0, flexShrink: 0 }}
                    >
                      ✕
                    </button>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      📄 <strong>{m.fileName}</strong>
                    </span>
                  </div>
                  {m.status === "ok" && (
                    <span style={{ color: "#15803d", fontWeight: 600, flexShrink: 0 }}>
                      ✅ {m.nombreEmpresa} · {m.catKey ? ALL_CATALOGOS.find((c) => c.key === m.catKey)?.label ?? m.catKey : "todos los catálogos"}
                    </span>
                  )}
                  {m.status === "notfound" && (
                    <span style={{ color: "#dc2626", flexShrink: 0 }}>❌ SAP {m.sap} no encontrado en diseño</span>
                  )}
                  {m.status === "nocatalog" && (
                    <span style={{ color: "#d97706", flexShrink: 0 }}>
                      ⚠️ {m.nombreEmpresa} — catálogo {m.catKey} sin portada personalizada
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="btn btn-amber" disabled={okCount === 0 || procesando} onClick={procesar}>
              {procesando ? "Procesando..." : `Procesar ${okCount} portada${okCount !== 1 ? "s" : ""} → Revisión cliente`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
