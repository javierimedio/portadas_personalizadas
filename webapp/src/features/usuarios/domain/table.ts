import { ROL_LABELS } from "@/features/layout/domain/nav-items";
import type { PerfilUsuario } from "./types";

export { ROL_LABELS };

// Réplica de ROL_COLORS (index.html ~2308).
export const ROL_COLORS: Record<string, string> = {
  responsable_diseno: "var(--c-purple)",
  admin: "var(--c-amber)",
  marketing: "var(--c-blue)",
  responsable: "#0F6E56",
  responsable_nacional: "#0F6E56",
  responsable_exportacion: "#0F6E56",
  comercial: "var(--c-teal)",
  comercial_nacional: "var(--c-teal)",
  comercial_exportacion: "var(--c-teal)",
  disenador: "var(--c-purple)",
};

export type UsuariosFilters = { q: string; rol: string; activo: string };

// Réplica del filtrado de renderUsuariosTable() (~2316-2323, USR-02).
export function filterPerfiles(perfiles: PerfilUsuario[], filters: UsuariosFilters): PerfilUsuario[] {
  const q = filters.q.trim().toLowerCase();
  return perfiles.filter((p) => {
    if (q) {
      const matches =
        p.nombre?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (filters.rol && p.rol !== filters.rol) return false;
    if (filters.activo && String(p.activo) !== filters.activo) return false;
    return true;
  });
}

const USER_STAT_LABELS: Record<string, string> = {
  comercial: "Comercial",
  comercial_nacional: "Com. Nacional",
  comercial_exportacion: "Com. Export.",
  marketing: "Marketing",
  disenador: "Diseñador",
  responsable_nacional: "Resp. Nacional",
  responsable_exportacion: "Resp. Export.",
  admin: "Administrador",
};

const STATS_ROLES = [
  "comercial_nacional",
  "comercial_exportacion",
  "marketing",
  "disenador",
  "responsable_nacional",
  "responsable_exportacion",
  "admin",
];

export type UsuarioStat = { rol: string; label: string; color: string; count: number };

// Réplica de las tarjetas de estadísticas (~2325-2332, USR-03): solo cuenta
// usuarios activos, sobre TODOS los perfiles (no los ya filtrados por la
// búsqueda/filtros de la tabla).
export function statsPorRol(perfiles: PerfilUsuario[]): UsuarioStat[] {
  return STATS_ROLES.map((rol) => ({
    rol,
    label: USER_STAT_LABELS[rol] ?? rol,
    color: ROL_COLORS[rol] ?? "var(--c-mid)",
    count: perfiles.filter((p) => p.rol === rol && p.activo).length,
  }));
}
