"use client";

import { useRef, useState } from "react";
import { subirArchivo, borrarArchivoSubido } from "@/shared/storage/upload-client";
import type { UploadedFile } from "@/shared/storage/types";

// Réplica visual exacta de las zonas de arrastrar/soltar de PDF del modal de
// campañas (index.html ~1329-1343, setCoverFile() ~4763-4772, restauración
// de covers existentes ~4986-4998): más compactas que `FileDropZone`
// (`features/solicitudes/ui/file-drop-zone.tsx`, pensada para logo/diseño
// propio) — un solo PDF por zona, no una lista de varios archivos.
//
// Arquitectura de subida (docs/09-matriz-paridad-funcional.md §
// "Arquitectura de subida de archivos", 2026-08-04): el PDF se sube al
// elegirlo, directamente desde el navegador a Supabase Storage — el
// `<form action={saveCampana}>` nunca ve el binario, solo tres campos
// ocultos (path/url/nombre) con el mismo `name` prefijado, para que
// `saveCampana()` los pueda leer sin tener que tocar Storage.
export function CampanaFileDropZone({
  name,
  accept,
  existingUrl,
  carpeta,
  icon = "📄",
  label = "Arrastra el PDF o haz clic",
  onUploadingChange,
}: {
  name: string;
  accept: string;
  existingUrl?: string | null;
  carpeta: string;
  icon?: string;
  label?: string;
  onUploadingChange?: (subiendo: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [subido, setSubido] = useState<UploadedFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setFile(f: File | null) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) return;
    if (subido) borrarArchivoSubido(subido.path);
    setError(null);
    setSubido(null);
    setSubiendo(true);
    onUploadingChange?.(true);
    try {
      const meta = await subirArchivo(f, carpeta);
      setSubido(meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir el archivo.");
    } finally {
      setSubiendo(false);
      onUploadingChange?.(false);
    }
  }

  const variant = subiendo ? "subiendo" : subido ? "nuevo" : existingUrl ? "existente" : "vacio";
  const borderColor =
    variant === "nuevo" ? "var(--c-amber)" : variant === "existente" ? "var(--c-green)" : variant === "subiendo" ? "var(--c-blue)" : "var(--c-line)";
  const background =
    variant === "nuevo" ? "var(--c-amber-l)" : variant === "existente" ? "#E8F5E9" : variant === "subiendo" ? "var(--c-blue-l)" : "transparent";

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          setFile(e.dataTransfer.files[0] ?? null);
        }}
        style={{
          border: `1.5px dashed ${borderColor}`,
          borderRadius: 6,
          padding: "8px 10px",
          cursor: "pointer",
          fontSize: 11,
          color: "var(--c-mid)",
          textAlign: "center",
          background,
        }}
      >
        {variant === "subiendo" ? (
          <>⏳ Subiendo...</>
        ) : variant === "nuevo" && subido ? (
          <>
            ✅ {subido.nombre} <span style={{ fontSize: 10, color: "var(--c-mid)" }}>({(subido.size / 1024).toFixed(0)}KB)</span>
          </>
        ) : variant === "existente" ? (
          <>
            ✅ PDF cargado{" "}
            <a href={existingUrl ?? undefined} target="_blank" rel="noreferrer" style={{ color: "var(--c-blue)" }}>
              Ver
            </a>{" "}
            · <span style={{ color: "var(--c-mid)" }}>Sube otro para reemplazar</span>
          </>
        ) : (
          <>
            {icon} {label}
          </>
        )}
      </div>
      {error && <div style={{ fontSize: 11, color: "var(--c-red)", marginTop: 4 }}>{error}</div>}
      {subido && (
        <>
          <input type="hidden" name={`${name}_path`} value={subido.path} />
          <input type="hidden" name={`${name}_url`} value={subido.url} />
          <input type="hidden" name={`${name}_nombre`} value={subido.nombre} />
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
    </div>
  );
}
