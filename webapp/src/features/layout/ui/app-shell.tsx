"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/features/auth/application/logout.action";
import { NotifBell } from "@/features/notificaciones/ui/notif-bell";
import { IMPERSONATION_COOKIE } from "../domain/impersonation";
import { getNavItemsForRole, IMPERSONATABLE_ROLES } from "../domain/nav-items";

// Réplica visual y funcional de la topbar + #main-nav + drawer móvil de
// index.html (~76-90, ~520-575, ~5100-5127, ~5913-5951) — clases .topbar/
// .topbar-brand/.nav/.nav-btn portadas literalmente en globals.css, no
// reinterpretadas con utilidades sueltas de Tailwind (docs/00-resumen-
// ejecutivo.md § "paridad visual").
//
// La impersonación cambia el nav al instante (estado de cliente, igual que
// `currentPerfil.rol` del original) y además escribe una cookie + fuerza
// `router.refresh()` para que las páginas que consultan datos en el
// servidor (el Dashboard) también vean el rol "efectivo" — sin esto,
// impersonar solo cambiaría el nav sin cambiar ningún dato. La sesión real
// y sus permisos de RLS no cambian en ningún caso.
export function AppShell({
  email,
  nombre,
  rol,
  children,
}: {
  email: string;
  nombre: string | null;
  rol: string | null;
  children: React.ReactNode;
}) {
  const [impersonatedRol, setImpersonatedRol] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const isAdmin = rol === "admin";
  const effectiveRol = isAdmin && impersonatedRol ? impersonatedRol : rol;
  const navItems = getNavItemsForRole(effectiveRol);
  const displayName = nombre ?? email;

  function handleImpersonate(value: string) {
    setImpersonatedRol(value || null);
    document.cookie = value
      ? `${IMPERSONATION_COOKIE}=${value}; path=/`
      : `${IMPERSONATION_COOKIE}=; path=/; max-age=0`;
    router.refresh();
  }

  // Elige a qué página navegar al hacer clic en una notificación: en el
  // original todo el detalle vivía en un único modal accesible desde
  // cualquier pestaña; aquí hay que aterrizar en una ruta real que ese rol
  // pueda ver — /solicitudes si la tiene, si no /diseno (todo rol que puede
  // recibir una notificación de una solicitud tiene acceso a al menos una
  // de las dos, ver nav-items.ts).
  function verSolicitudHref(solicitudId: string) {
    const ids = navItems.map((i) => i.id);
    if (ids.includes("solicitudes")) return `/solicitudes?ver=${solicitudId}`;
    if (ids.includes("diseno")) return `/diseno?ver=${solicitudId}`;
    return "/";
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="topbar">
        <div className="topbar-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/Logo_GOR.png" alt="GOR Factory" style={{ height: 20, filter: "brightness(0) invert(1)" }} />
          <span style={{ color: "white", fontWeight: 700 }}>PORTADAS PERSONALIZADAS</span>
          <span style={{ color: "rgba(255,255,255,.35)", margin: "0 8px", fontWeight: 300 }}>|</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo_Roly_2025.svg"
            alt="Roly"
            style={{ height: 14, filter: "brightness(0) invert(1)", opacity: 0.5 }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/Logo_WRK_color.svg"
            alt="Roly WRK"
            style={{ height: 14, filter: "brightness(0) invert(1)", opacity: 0.5, marginLeft: 10 }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-stm-small.svg"
            alt="Stamina"
            style={{ height: 14, filter: "brightness(0) invert(1)", opacity: 0.5, marginLeft: 10 }}
          />
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <select
              value={impersonatedRol ?? ""}
              onChange={(e) => handleImpersonate(e.target.value)}
              title="Simular rol (solo admin)"
              className="hidden md:inline-block"
              style={{
                fontSize: 11,
                padding: "3px 8px",
                border: "1px solid rgba(255,255,255,.4)",
                borderRadius: 6,
                background: "#3a3a38",
                color: "white",
                cursor: "pointer",
              }}
            >
              <option value="">👁 Ver como rol...</option>
              {IMPERSONATABLE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          )}

          <NotifBell verSolicitudHref={verSolicitudHref} />

          <Link
            href="/perfil"
            title="Mi cuenta"
            style={{
              background: "rgba(255,255,255,.12)",
              border: "1px solid rgba(255,255,255,.25)",
              color: "white",
              fontSize: 12,
              fontWeight: 500,
              padding: ".35rem .75rem",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <span style={{ fontSize: 13, opacity: 0.9 }}>⚙️</span>
            <span style={{ opacity: 0.65, fontSize: 11, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>
              Mi cuenta
            </span>
            <span style={{ opacity: 0.3, fontSize: 10 }}>|</span>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{displayName}</span>
          </Link>

          <form action={logout}>
            <button
              type="submit"
              style={{
                padding: ".4rem .9rem",
                borderRadius: 4,
                border: "1px solid rgba(255,255,255,.3)",
                background: "rgba(255,255,255,.1)",
                color: "white",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cerrar sesión
            </button>
          </form>

          <button
            type="button"
            aria-label="Menú"
            onClick={() => setDrawerOpen((v) => !v)}
            className="flex flex-col gap-1 p-1 md:hidden"
          >
            <span className="h-0.5 w-5 bg-white" />
            <span className="h-0.5 w-5 bg-white" />
            <span className="h-0.5 w-5 bg-white" />
          </button>
        </div>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setDrawerOpen(false)} />
      )}

      <nav
        className={`nav fixed inset-y-0 left-0 z-50 w-64 flex-col shadow-lg transition-transform md:static md:w-auto md:flex-row md:shadow-none md:translate-x-0 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setDrawerOpen(false)}
              className={`nav-btn ${active ? "active" : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="main flex-1 w-full">{children}</main>
    </div>
  );
}
