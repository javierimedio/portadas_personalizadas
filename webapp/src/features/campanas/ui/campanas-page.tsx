"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/shared/ui/toast";
import { CampanaModal } from "./campana-modal";
import { eliminarCampana } from "../application/eliminar-campana.action";
import { ACTIVE_CAMPANA_COOKIE } from "../domain/active-campana";
import type { CampanaListItem } from "../domain/types";

type ModalState = { mode: "new" } | { mode: "edit"; campana: CampanaListItem } | null;

// Réplica de #page-campanas (index.html ~630-641 estilo tabla, ~4899-5098
// renderCampanasTable()/setActiveCampana()/eliminarCampana()): CAMP-01 a
// CAMP-05, CAMP-12 a CAMP-14. "Usar como activa" es una selección de sesión
// (cookie, no persiste en BD — CAMP-01/CAMP-04/CAMP-05), distinta del flag
// `activa` de la campaña.
export function CampanasPageClient({ campanas, activeCampanaId }: { campanas: CampanaListItem[]; activeCampanaId: string }) {
  const [modal, setModal] = useState<ModalState>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  function handleSaved() {
    setModal(null);
    router.refresh();
  }

  function usarComoActiva(c: CampanaListItem) {
    if (!window.confirm("¿Establecer esta campaña como la activa para nuevas solicitudes?")) return;
    document.cookie = `${ACTIVE_CAMPANA_COOKIE}=${c.id}; path=/`;
    toast(`Campaña "${c.nombre}" establecida como activa.`);
    router.refresh();
  }

  async function eliminar(c: CampanaListItem) {
    const warn = c.solicitudesCount > 0 ? `\n\n⚠️ Esta campaña tiene ${c.solicitudesCount} solicitud(es) asociadas. También se eliminarán.` : "";
    if (!window.confirm(`¿Eliminar la campaña "${c.nombre}"? Esta acción no se puede deshacer.${warn}`)) return;

    setBusy(true);
    const res = await eliminarCampana(c.id);
    setBusy(false);
    if (res.error) {
      toast(res.error);
      return;
    }
    // CAMP-14: si la campaña eliminada era la activa, se limpia la selección.
    if (c.id === activeCampanaId) document.cookie = `${ACTIVE_CAMPANA_COOKIE}=; path=/; max-age=0`;
    toast(`Campaña "${c.nombre}" eliminada.`);
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div className="section-title">Campañas</div>
          <div className="section-sub">Gestiona las campañas de portadas personalizadas por año.</div>
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
                <th>Cierre</th>
                <th>Solicitudes</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {campanas.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <p>No hay campañas creadas.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                campanas.map((c) => {
                  const isActive = c.id === activeCampanaId;
                  return (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.nombre}</strong>
                        {isActive && (
                          <span
                            style={{
                              fontSize: 10,
                              background: "var(--c-green-l)",
                              color: "var(--c-green)",
                              padding: "1px 6px",
                              borderRadius: 10,
                              marginLeft: 6,
                              fontWeight: 700,
                            }}
                          >
                            ACTIVA
                          </span>
                        )}
                      </td>
                      <td className="text-sm text-mid">{c.descripcion || "—"}</td>
                      <td className="text-sm">{c.fecha_cierre ? c.fecha_cierre.slice(0, 10) : "—"}</td>
                      <td className="text-sm" style={{ textAlign: "center" }}>
                        {c.solicitudesCount}
                      </td>
                      <td>
                        <span style={{ color: c.activa ? "var(--c-green)" : "var(--c-mid)" }}>{c.activa ? "● Activa" : "● Inactiva"}</span>
                      </td>
                      <td>
                        <div className="gap-8">
                          <button type="button" className="btn btn-sm btn-outline" onClick={() => setModal({ mode: "edit", campana: c })}>
                            Editar
                          </button>
                          {!isActive && c.activa && (
                            <button type="button" className="btn btn-sm btn-green" disabled={busy} onClick={() => usarComoActiva(c)}>
                              Usar como activa
                            </button>
                          )}
                          <button type="button" className="btn btn-sm btn-danger" disabled={busy} title="Eliminar campaña" onClick={() => eliminar(c)}>
                            🗑 Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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
