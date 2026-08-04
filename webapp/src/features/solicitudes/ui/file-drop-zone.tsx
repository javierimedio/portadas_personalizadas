"use client";

import { useEffect, useRef, useState } from "react";
import { subirArchivo, borrarArchivoSubido } from "@/shared/storage/upload-client";
import type { UploadedFile } from "@/shared/storage/types";

type Entry = {
  id: string;
  nombre: string;
  size: number;
  status: "subiendo" | "ok" | "error";
  meta?: UploadedFile;
  error?: string;
};

// Réplica de las zonas de subida de index.html (~1159-1175, ~2541-2551):
// zona de arrastrar/soltar con lista de archivos seleccionados.
//
// Arquitectura de subida (docs/09-matriz-paridad-funcional.md §
// "Arquitectura de subida de archivos", 2026-08-04): cada archivo se sube
// nada más elegirlo, directamente desde el navegador a Supabase Storage —
// el `<form action={saveSolicitud}>` nunca ve el binario. Lo único que
// viaja en el envío del formulario es un input oculto con `name` igual a
// `name` cuyo valor es un JSON con la lista de archivos ya subidos
// (path/url/nombre/tipo/size), que `saveSolicitud()` puede leer sin volver
// a tocar Storage.
export function FileDropZone({
  name,
  accept,
  carpeta,
  existingFiles = [],
  hint,
  icon = "📎",
  onUploadingChange,
}: {
  name: string;
  accept: string;
  carpeta: string;
  existingFiles?: { nombre: string; url: string }[];
  hint: string;
  icon?: string;
  onUploadingChange?: (subiendo: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<Entry[]>([]);

  const subiendo = entries.some((e) => e.status === "subiendo");
  useEffect(() => {
    onUploadingChange?.(subiendo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subiendo]);

  function addFiles(newFiles: File[]) {
    for (const file of newFiles) {
      if (entries.some((e) => e.nombre === file.name && e.size === file.size)) continue;
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      setEntries((prev) => [...prev, { id, nombre: file.name, size: file.size, status: "subiendo" }]);
      subirArchivo(file, carpeta)
        .then((meta) => {
          setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status: "ok", meta } : e)));
        })
        .catch((err) => {
          setEntries((prev) =>
            prev.map((e) => (e.id === id ? { ...e, status: "error", error: err instanceof Error ? err.message : "Error al subir." } : e))
          );
        });
    }
  }

  function removeFile(id: string) {
    setEntries((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry?.status === "ok" && entry.meta) borrarArchivoSubido(entry.meta.path);
      return prev.filter((e) => e.id !== id);
    });
  }

  const metadatos = entries.filter((e) => e.status === "ok").map((e) => e.meta);

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.style.borderColor = "var(--c-amber)";
          e.currentTarget.style.background = "var(--c-amber-l)";
        }}
        onDragLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--c-line)";
          e.currentTarget.style.background = "var(--c-white)";
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.style.borderColor = "var(--c-line)";
          e.currentTarget.style.background = "var(--c-white)";
          addFiles(Array.from(e.dataTransfer.files));
        }}
        style={{
          border: "2px dashed var(--c-line)",
          borderRadius: "var(--radius)",
          padding: "1.25rem",
          textAlign: "center",
          cursor: "pointer",
          transition: "all .15s",
          background: "var(--c-white)",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--c-dark)" }}>Arrastra el archivo aquí o haz clic</div>
        <div style={{ fontSize: 11, color: "var(--c-mid)", marginTop: 4 }}>{hint}</div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          addFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <input type="hidden" name={name} value={JSON.stringify(metadatos)} />
      {(existingFiles.length > 0 || entries.length > 0) && (
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {existingFiles.map((f) => (
            <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="file-chip" style={{ textDecoration: "none" }}>
              📄 {f.nombre}
            </a>
          ))}
          {entries.map((e) => (
            <div key={e.id} className="file-chip">
              {e.status === "subiendo" ? "⏳" : e.status === "error" ? "⚠️" : "📄"} {e.nombre}{" "}
              <span style={{ color: e.status === "error" ? "var(--c-red)" : "var(--c-mid)" }}>
                {e.status === "error" ? e.error : `(${(e.size / 1024).toFixed(0)}kb)`}
              </span>
              <button type="button" onClick={() => removeFile(e.id)} title="Eliminar">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
