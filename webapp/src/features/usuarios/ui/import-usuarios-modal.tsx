"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { useToast } from "@/shared/ui/toast";
import { useEscapeToClose } from "@/shared/ui/use-escape-to-close";
import { parseImportRows, rolValido, type ImportUsuario } from "../domain/import";
import { crearUsuario } from "../application/crear-usuario.action";

// Réplica de #modal-import-users / processImportFile() / confirmImport()
// (index.html ~1427-1456, ~5654-5768): USR-12 a USR-15. El progreso en vivo
// (USR-15) se replica de verdad con un bucle en el cliente que llama a la
// misma Server Action de creación de usuario que usa el modal individual —
// no hay una llamada directa a la Admin API de Supabase desde aquí (esa
// era la causa del hallazgo H-15: normalmente exige la service_role key,
// que este proyecto nunca expone a código que responde a una petición de
// usuario — ver docs/02-arquitectura.md § 2.6/2.7).
export function ImportarUsuariosModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [rows, setRows] = useState<ImportUsuario[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const [progreso, setProgreso] = useState({ ok: 0, errores: 0 });
  const { toast } = useToast();
  useEscapeToClose(onClose);

  function procesarArchivo(file: File) {
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0] ?? ""];
        if (!ws) throw new Error("El archivo no contiene ninguna hoja.");
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
        const parsed = parseImportRows(raw);
        if (!parsed.length) {
          setError("No se encontraron usuarios válidos en el archivo.");
          setRows([]);
          return;
        }
        setRows(parsed);
      } catch (err) {
        setError(`Error al leer el archivo: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  const invalidas = rows.filter((u) => !rolValido(u.rol));

  async function confirmarImportacion() {
    setImportando(true);
    let ok = 0;
    let errores = 0;
    // INSTRUMENTACIÓN TEMPORAL (2026-08-04) — diagnóstico en curso de "0
    // creados, N errores" (docs/09-matriz-paridad-funcional.md § H-01). No
    // quitar hasta confirmar en qué línea exacta se incrementa `errores`.
    // Esto corre en el NAVEGADOR: abre la consola del navegador (F12) para
    // verlo. La llamada a crearUsuario() en sí corre en el SERVOR — su
    // propia instrumentación aparece en los logs del servidor (terminal de
    // `next dev`/`next start`, o Vercel → Deployments → Functions → Logs),
    // nunca aquí.
    console.log(`[IMPORT] Iniciando importación de ${rows.length} fila(s).`);
    let index = 0;
    for (const u of rows) {
      index++;
      console.log(`[IMPORT] Fila ${index}/${rows.length}`, {
        email: u.email,
        nombre: u.nombre,
        rol: u.rol,
        codigo: u.codigo,
        passwordPresente: Boolean(u.pass),
        passwordLength: u.pass?.length ?? 0,
      });
      const res = await crearUsuario({ nombre: u.nombre, email: u.email, password: u.pass, rol: u.rol, codigo: u.codigo });
      console.log(`[IMPORT] Fila ${index}/${rows.length} — respuesta de crearUsuario()`, res);
      if (res.error) {
        console.warn(`[IMPORT] Fila ${index}/${rows.length} — CONTABILIZADA COMO ERROR`, { email: u.email, error: res.error });
        errores++;
      } else {
        console.log(`[IMPORT] Fila ${index}/${rows.length} — CONTABILIZADA COMO OK`, { email: u.email });
        ok++;
      }
      setProgreso({ ok, errores });
    }
    console.log(`[IMPORT] Importación finalizada. ok=${ok} errores=${errores} (total filas=${rows.length}).`);
    setImportando(false);
    toast(`Importación completada: ${ok} creados${errores > 0 ? `, ${errores} errores` : ""}.`);
    onImported();
  }

  return (
    <div className="modal-bg open">
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <div className="modal-title">Importar usuarios desde Excel</div>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          {error && (
            <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
              {error}
            </div>
          )}
          <div className="alert alert-info" style={{ marginBottom: "1rem" }}>
            El Excel debe tener estas columnas en orden: <strong>email · nombre · contraseña · rol · código</strong>
            <br />
            Roles válidos: <code>comercial_nacional</code>, <code>comercial_exportacion</code>, <code>responsable_nacional</code>,{" "}
            <code>responsable_exportacion</code>, <code>responsable_diseno</code>, <code>marketing</code>, <code>disenador</code>,{" "}
            <code>admin</code>
          </div>
          <div
            onClick={() => document.getElementById("input-import-excel")?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) procesarArchivo(file);
            }}
            style={{ border: "2px dashed var(--c-line)", borderRadius: "var(--radius)", padding: "2rem", textAlign: "center", cursor: "pointer" }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Arrastra el Excel aquí o haz clic</div>
            <div style={{ fontSize: 12, color: "var(--c-mid)", marginTop: 4 }}>.xlsx o .csv</div>
          </div>
          <input
            id="input-import-excel"
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) procesarArchivo(file);
              e.target.value = "";
            }}
          />

          {rows.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: ".5rem" }}>{rows.length} usuarios encontrados:</div>
              {invalidas.length > 0 && (
                <div className="alert alert-error" style={{ marginBottom: ".5rem" }}>
                  {invalidas.length} fila(s) con rol no válido.
                </div>
              )}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--c-light)" }}>
                      <th style={{ padding: "6px 8px", textAlign: "left" }}>Email</th>
                      <th style={{ padding: "6px 8px", textAlign: "left" }}>Nombre</th>
                      <th style={{ padding: "6px 8px", textAlign: "left" }}>Rol</th>
                      <th style={{ padding: "6px 8px", textAlign: "left" }}>Código</th>
                      <th style={{ padding: "6px 8px", textAlign: "left" }}>Pass</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 10).map((u, i) => (
                      <tr key={`${u.email}-${i}`} style={{ borderBottom: "1px solid var(--c-line)" }}>
                        <td style={{ padding: "5px 8px" }}>{u.email}</td>
                        <td style={{ padding: "5px 8px" }}>{u.nombre}</td>
                        <td style={{ padding: "5px 8px", color: rolValido(u.rol) ? "var(--c-green)" : "var(--c-red)" }}>{u.rol}</td>
                        <td style={{ padding: "5px 8px" }}>{u.codigo || "—"}</td>
                        <td style={{ padding: "5px 8px", color: "var(--c-mid)" }}>••••••••</td>
                      </tr>
                    ))}
                    {rows.length > 10 && (
                      <tr>
                        <td colSpan={5} style={{ padding: "6px 8px", color: "var(--c-mid)", fontStyle: "italic" }}>
                          ...y {rows.length - 10} más
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancelar
          </button>
          {rows.length > 0 && (
            <button type="button" className="btn btn-amber" disabled={importando} onClick={confirmarImportacion}>
              {importando ? `Importando... ${progreso.ok + progreso.errores}/${rows.length}` : "Importar usuarios"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
