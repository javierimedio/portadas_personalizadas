"use client";

import { useRef } from "react";

// Réplica de las zonas de subida de index.html (~1159-1175, ~2541-2551):
// input real oculto + zona de arrastrar/soltar, sincronizados a través de
// un DataTransfer para que el <input type="file"> participe en el envío
// nativo del formulario (useActionState/FormData) sin JS adicional.
export function FileDropZone({
  name,
  accept,
  files,
  onFilesChange,
  existingFiles = [],
  hint,
  icon = "📎",
}: {
  name: string;
  accept: string;
  files: File[];
  onFilesChange: (files: File[]) => void;
  existingFiles?: { nombre: string; url: string }[];
  hint: string;
  icon?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function syncInput(list: File[]) {
    const dt = new DataTransfer();
    list.forEach((f) => dt.items.add(f));
    if (inputRef.current) inputRef.current.files = dt.files;
  }

  function addFiles(newFiles: File[]) {
    const merged = [...files];
    for (const f of newFiles) {
      if (!merged.find((x) => x.name === f.name && x.size === f.size)) merged.push(f);
    }
    syncInput(merged);
    onFilesChange(merged);
  }

  function removeFile(fname: string, fsize: number) {
    const remaining = files.filter((f) => !(f.name === fname && f.size === fsize));
    syncInput(remaining);
    onFilesChange(remaining);
  }

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
      <input ref={inputRef} type="file" name={name} accept={accept} multiple style={{ display: "none" }} onChange={(e) => addFiles(Array.from(e.target.files ?? []))} />
      {(existingFiles.length > 0 || files.length > 0) && (
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {existingFiles.map((f) => (
            <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="file-chip" style={{ textDecoration: "none" }}>
              📄 {f.nombre}
            </a>
          ))}
          {files.map((f) => (
            <div key={`${f.name}-${f.size}`} className="file-chip">
              📄 {f.name} <span style={{ color: "var(--c-mid)" }}>({(f.size / 1024).toFixed(0)}kb)</span>
              <button type="button" onClick={() => removeFile(f.name, f.size)} title="Eliminar">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
