"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CampanaModal } from "./campana-modal";
import type { CampanaListItem } from "../domain/types";

type ModalState = { mode: "new" } | { mode: "edit"; campana: CampanaListItem } | null;

// Réplica de #page-campanas (index.html ~630-641 estilo tabla, ~4899-4931
// renderCampanasTable()) — sin "Usar como activa" (concepto solo en
// memoria del cliente en el original, no persiste en BD) ni "Eliminar"
// (borrado en cascada, fuera de alcance de este bloque).
export function CampanasPageClient({ campanas }: { campanas: CampanaListItem[] }) {
  const [modal, setModal] = useState<ModalState>(null);
  const router = useRouter();

  function handleSaved() {
    setModal(null);
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <div className="section-title">Campañas</div>
          <div className="section-sub" style={{ marginBottom: 0 }}>
            Gestiona las campañas y sus catálogos de portadas.
          </div>
        </div>
        <button type="button" className="btn btn-amber" onClick={() => setModal({ mode: "new" })}>
          + Nueva campaña
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Fecha cierre</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {campanas.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <p>No hay campañas creadas.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                campanas.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.nombre}</strong>
                    </td>
                    <td className="text-sm text-mid">{c.descripcion || "—"}</td>
                    <td className="text-sm">{c.fecha_cierre ? c.fecha_cierre.slice(0, 10) : "—"}</td>
                    <td>
                      <span style={{ color: c.activa ? "var(--c-green)" : "var(--c-mid)" }}>
                        {c.activa ? "● Activa" : "● Inactiva"}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => setModal({ mode: "edit", campana: c })}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <CampanaModal
          campana={modal.mode === "edit" ? modal.campana : null}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
