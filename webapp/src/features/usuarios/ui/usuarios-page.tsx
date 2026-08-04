"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fmtDate } from "@/shared/domain/format";
import { filterPerfiles, statsPorRol, ROL_LABELS, ROL_COLORS } from "../domain/table";
import { toggleUsuario } from "../application/actualizar-usuario.action";
import { UsuarioModal } from "./usuario-modal";
import { ImportarUsuariosModal } from "./import-usuarios-modal";
import type { PerfilUsuario } from "../domain/types";

type ModalState = { mode: "new" } | { mode: "edit"; usuario: PerfilUsuario } | { mode: "import" } | null;

// Réplica de #page-usuarios (index.html ~725-776, ~2311-2364): USR-01 a
// USR-15.
export function UsuariosPageClient({ perfiles, rol }: { perfiles: PerfilUsuario[]; rol: string | null | undefined }) {
  const [q, setQ] = useState("");
  const [rolFiltro, setRolFiltro] = useState("");
  const [activoFiltro, setActivoFiltro] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();

  const filtrados = useMemo(() => filterPerfiles(perfiles, { q, rol: rolFiltro, activo: activoFiltro }), [perfiles, q, rolFiltro, activoFiltro]);
  const stats = useMemo(() => statsPorRol(perfiles), [perfiles]);

  function handleSaved() {
    setModal(null);
    router.refresh();
  }

  async function toggle(p: PerfilUsuario) {
    setBusyId(p.id);
    await toggleUsuario(p.id, p.activo);
    setBusyId(null);
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="section-title">Gestión de usuarios</div>
          <div className="section-sub">Edita roles, activa y desactiva accesos a la herramienta.</div>
        </div>
        <div className="gap-8">
          <button type="button" className="btn btn-outline" onClick={() => setModal({ mode: "import" })}>
            📊 Importar
          </button>
          {rol === "admin" && (
            <button type="button" className="btn btn-amber" onClick={() => setModal({ mode: "new" })}>
              + Nuevo usuario
            </button>
          )}
        </div>
      </div>

      <div className="stats-row" style={{ marginBottom: "1.5rem", display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
        {stats.map((s) => (
          <div key={s.rol} className="stat-card" style={{ flex: 1, minWidth: 100 }}>
            <div className="stat-num" style={{ color: s.color }}>
              {s.count}
            </div>
            <div className="stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: "1rem", flexWrap: "wrap" }}>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, email o código..."
          style={{ flex: 1, minWidth: 200 }}
        />
        <select value={rolFiltro} onChange={(e) => setRolFiltro(e.target.value)}>
          <option value="">Todos los roles</option>
          <optgroup label="Comercial">
            <option value="comercial_nacional">Comercial Nacional</option>
            <option value="comercial_exportacion">Comercial Exportación</option>
          </optgroup>
          <optgroup label="Responsable">
            <option value="responsable_nacional">Resp. Nacional</option>
            <option value="responsable_exportacion">Resp. Exportación</option>
          </optgroup>
          <optgroup label="Responsable Diseño">
            <option value="responsable_diseno">Resp. Diseño</option>
          </optgroup>
          <optgroup label="Interno">
            <option value="marketing">Marketing</option>
            <option value="disenador">Diseñador</option>
            <option value="admin">Admin</option>
          </optgroup>
        </select>
        <select value={activoFiltro} onChange={(e) => setActivoFiltro(e.target.value)}>
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Código</th>
                <th>Estado</th>
                <th>Creado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <div className="icon">👥</div>
                      <p>No hay usuarios que coincidan.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtrados.map((p) => (
                  <tr key={p.id} style={{ opacity: p.activo ? 1 : 0.5 }}>
                    <td>
                      <strong>{p.nombre}</strong>
                    </td>
                    <td className="text-sm text-mid">{p.email}</td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 700,
                          background: `${ROL_COLORS[p.rol ?? ""] ?? "var(--c-mid)"}20`,
                          color: ROL_COLORS[p.rol ?? ""] ?? "var(--c-mid)",
                        }}
                      >
                        {ROL_LABELS[p.rol ?? ""] ?? p.rol}
                      </span>
                    </td>
                    <td className="text-sm">{p.codigo || "—"}</td>
                    <td>
                      <span style={{ color: p.activo ? "var(--c-green)" : "var(--c-red)" }}>{p.activo ? "● Activo" : "● Inactivo"}</span>
                    </td>
                    <td className="text-sm text-mid">{p.created_at ? fmtDate(p.created_at).split(" ")[0] : "—"}</td>
                    <td>
                      <div className="gap-8">
                        <button type="button" className="btn btn-sm btn-outline" onClick={() => setModal({ mode: "edit", usuario: p })}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm btn-outline ${p.activo ? "btn-danger" : "btn-green"}`}
                          disabled={busyId === p.id}
                          onClick={() => toggle(p)}
                        >
                          {p.activo ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (modal.mode === "new" || modal.mode === "edit") && (
        <UsuarioModal usuario={modal.mode === "edit" ? modal.usuario : null} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
      {modal?.mode === "import" && <ImportarUsuariosModal onClose={() => setModal(null)} onImported={handleSaved} />}
    </div>
  );
}
