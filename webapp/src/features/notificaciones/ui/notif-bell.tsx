"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fmtDate } from "@/shared/domain/format";
import { createClient } from "@/shared/infrastructure/supabase/browser-client";
import { getNotificaciones } from "../application/get-notificaciones";
import { badgeTexto, contarNoLeidas, truncarCuerpo, type NotificacionItem } from "../domain/panel";
import { getReadIds, markAllRead } from "../infrastructure/read-state";

// Réplica del botón 🔔 + panel lateral (index.html ~554-557, ~968-978,
// ~5404-5470): NOT-13 a NOT-19. `verSolicitudHref` decide a qué ruta
// navegar al hacer clic en una notificación — en el original todo vivía en
// una sola página, aquí hay que elegir entre /solicitudes y /diseno según
// lo que el rol actual pueda ver.
export function NotifBell({ verSolicitudHref }: { verSolicitudHref: (solicitudId: string) => string }) {
  const [notifs, setNotifs] = useState<NotificacionItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setReadIds(getReadIds());
    getNotificaciones()
      .then(setNotifs)
      .catch(() => {});
  }, []);

  // Réplica de la suscripción separada a `notificaciones` (~4642-4645,
  // UI-18): más ligera que la de `solicitudes` — solo recarga la lista de
  // notificaciones, sin refrescar la página ni mostrar el aviso "↻ Datos
  // actualizados".
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("portadas-notificaciones")
      .on("postgres_changes", { event: "*", schema: "public", table: "notificaciones" }, () => {
        getNotificaciones()
          .then(setNotifs)
          .catch(() => {});
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Réplica de "marcar visibles como leídas a los 2s de abrir" (~5423-5427).
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      markAllRead(notifs.map((n) => n.id));
      setReadIds(getReadIds());
    }, 2000);
    return () => clearTimeout(timer);
  }, [open, notifs]);

  const unread = contarNoLeidas(notifs, readIds);

  function marcarTodo() {
    markAllRead(notifs.map((n) => n.id));
    setReadIds(getReadIds());
  }

  function clickNotif(n: NotificacionItem) {
    setOpen(false);
    if (n.solicitud_id) router.push(verSolicitudHref(n.solicitud_id));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ position: "relative", background: "none", border: "none", cursor: "pointer", color: "white", fontSize: 18, padding: "4px 8px", lineHeight: 1 }}
      >
        🔔
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              background: "#E30613",
              color: "white",
              fontSize: 9,
              fontWeight: 700,
              padding: "1px 4px",
              borderRadius: 10,
              minWidth: 14,
              textAlign: "center",
            }}
          >
            {badgeTexto(unread)}
          </span>
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 149 }} />
          <div
            style={{
              position: "fixed",
              top: 52,
              right: 0,
              width: 360,
              maxWidth: "100vw",
              height: "calc(100vh - 52px)",
              background: "var(--c-white)",
              color: "var(--c-dark)",
              boxShadow: "-4px 0 20px rgba(0,0,0,.12)",
              zIndex: 150,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--c-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Notificaciones</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button type="button" onClick={marcarTodo} style={{ fontSize: 11, color: "var(--c-mid)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                  Marcar todo como leído
                </button>
                <button type="button" onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-mid)", fontSize: 18, lineHeight: 1 }}>
                  ✕
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: ".5rem 0" }}>
              {notifs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--c-mid)", fontSize: 13 }}>No hay notificaciones</div>
              ) : (
                notifs.map((n) => {
                  const isRead = readIds.has(n.id);
                  return (
                    <div
                      key={n.id}
                      className="notif-item"
                      onClick={() => clickNotif(n)}
                      style={{
                        padding: ".875rem 1.25rem",
                        borderBottom: "1px solid var(--c-line)",
                        cursor: n.solicitud_id ? "pointer" : "default",
                        background: isRead ? "var(--c-white)" : "var(--c-amber-l)",
                      }}
                    >
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <span style={{ fontSize: 16, flexShrink: 0 }}>🔔</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: isRead ? 400 : 600, color: "var(--c-dark)", marginBottom: 2, lineHeight: 1.4 }}>{n.asunto}</div>
                          <div style={{ fontSize: 11, color: "var(--c-mid)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {truncarCuerpo(n.cuerpo)}
                          </div>
                          <div style={{ fontSize: 10, color: "var(--c-mid)", marginTop: 4 }}>{fmtDate(n.created_at)}</div>
                        </div>
                        {!isRead && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--c-amber)", flexShrink: 0, marginTop: 4 }} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
