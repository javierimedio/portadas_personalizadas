"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/features/auth/application/logout.action";
import { IMPERSONATION_COOKIE } from "../domain/impersonation";
import { getNavItemsForRole, IMPERSONATABLE_ROLES } from "../domain/nav-items";

// Réplica funcional de la topbar + #main-nav + drawer móvil de index.html
// (~520-575, ~5100-5127, ~5913-5951). La impersonación cambia el nav al
// instante (estado de cliente, igual que `currentPerfil.rol` del original)
// y además escribe una cookie + fuerza `router.refresh()` para que las
// páginas que consultan datos en el servidor (el Dashboard) también vean el
// rol "efectivo" — sin esto, impersonar solo cambiaría el nav sin cambiar
// ningún dato, lo que sería más confuso que no tener impersonación en
// absoluto. La sesión real y sus permisos de RLS no cambian en ningún caso.
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

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-3 bg-neutral-900 px-4 py-2 text-white">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/GORFACTORY_LOGO.png" alt="GOR Factory" className="h-5 brightness-0 invert" />
          <span>PORTADAS PERSONALIZADAS</span>
          <span className="hidden items-center gap-2 opacity-60 md:flex">
            <span className="mx-1 text-white/35">|</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://static.gorfactory.es/images/header/logo_Roly_2025.svg"
              alt="Roly"
              className="h-3.5 brightness-0 invert"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://static.gorfactory.es/images/home/Logo_WRK_color.svg"
              alt="Roly WRK"
              className="h-3.5 brightness-0 invert"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://static.gorfactory.es/images/header/logo-stm-small.svg"
              alt="Stamina"
              className="h-3.5 brightness-0 invert"
            />
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <select
              value={impersonatedRol ?? ""}
              onChange={(e) => handleImpersonate(e.target.value)}
              title="Simular rol (solo admin)"
              className="hidden rounded border border-white/40 bg-neutral-800 px-2 py-1 text-xs md:inline-block"
            >
              <option value="">👁 Ver como rol...</option>
              {IMPERSONATABLE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          )}

          <Link
            href="/perfil"
            title="Mi cuenta"
            className="rounded-md border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium"
          >
            ⚙️ Mi cuenta | {displayName}
          </Link>

          <form action={logout}>
            <button
              type="submit"
              className="rounded border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold"
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
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <nav
        className={`z-50 flex flex-col gap-1 bg-white p-4 shadow-lg transition-transform md:static md:flex-row md:gap-0 md:border-b md:border-neutral-200 md:bg-neutral-50 md:p-0 md:shadow-none ${
          drawerOpen
            ? "fixed inset-y-0 left-0 w-64 translate-x-0"
            : "fixed inset-y-0 left-0 w-64 -translate-x-full md:w-auto md:translate-x-0"
        }`}
      >
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setDrawerOpen(false)}
              className={`rounded px-3 py-2 text-sm font-medium md:rounded-none md:border-b-2 md:px-4 md:py-3 ${
                active
                  ? "bg-neutral-900 text-white md:border-neutral-900 md:bg-transparent md:text-neutral-900"
                  : "text-neutral-600 hover:bg-neutral-100 md:border-transparent"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
