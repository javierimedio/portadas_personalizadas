"use client";

import { useRef, useState } from "react";

// Réplica visual exacta de las zonas de arrastrar/soltar de PDF del modal de
// campañas (index.html ~1329-1343, setCoverFile() ~4763-4772, restauración
// de covers existentes ~4986-4998): más compactas que `FileDropZone`
// (`features/solicitudes/ui/file-drop-zone.tsx`, pensada para logo/diseño
// propio) — un solo PDF por zona, no una lista de varios archivos. Se
// mantiene la arquitectura nueva (instrucciones dinámicas por idioma, no
// solo por catálogo) reutilizando este mismo componente visual tanto para
// "Portadas disponibles" como para cada idioma de "Instrucciones". Estado
// interno (no controlado): el `<input type="file">` real, oculto, sigue
// participando en el envío nativo del formulario por su `name`, igual que
// `FileDropZone` — el padre no necesita conocer el archivo seleccionado.
export function CampanaFileDropZone({
  name,
  accept,
  existingUrl,
  icon = "📄",
  label = "Arrastra el PDF o haz clic",
}: {
  name: string;
  accept: string;
  existingUrl?: string | null;
  icon?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFileState] = useState<File | null>(null);

  function syncInput(f: File | null) {
    const dt = new DataTransfer();
    if (f) dt.items.add(f);
    if (inputRef.current) inputRef.current.files = dt.files;
  }

  function setFile(f: File | null) {
    if (f && !f.name.toLowerCase().endsWith(".pdf")) return;
    syncInput(f);
    setFileState(f);
  }

  const variant = file ? "nuevo" : existingUrl ? "existente" : "vacio";
  const borderColor = variant === "nuevo" ? "var(--c-amber)" : variant === "existente" ? "var(--c-green)" : "var(--c-line)";
  const background = variant === "nuevo" ? "var(--c-amber-l)" : variant === "existente" ? "#E8F5E9" : "transparent";

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
        {variant === "nuevo" && file ? (
          <>
            ✅ {file.name} <span style={{ fontSize: 10, color: "var(--c-mid)" }}>({(file.size / 1024).toFixed(0)}KB)</span>
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
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        style={{ display: "none" }}
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
