// Réplica exacta de buildNav() en index.html (~1900-1922): qué botones de
// navegación ve cada rol, en el mismo orden. Sin dependencias de React/Next
// a propósito (regla de dependencias de docs/04-estructura-carpetas.md).
//
// H-07 (cerrado 2026-08-04, confirmado por el propietario del proyecto
// contra datos reales de producción): los roles legacy genéricos
// "comercial"/"responsable" (sin sufijo de canal) no existen en ningún
// usuario real — no cumplen ninguna condición de las de abajo y por tanto
// no reciben ningún item de navegación, a propósito.
export type NavItemId = "dashboard" | "solicitudes" | "panel" | "diseno" | "campanas" | "usuarios";

export type NavItem = { id: NavItemId; label: string; href: string };

const NAV_DEFS: Record<NavItemId, { label: string; href: string }> = {
  dashboard: { label: "Dashboard", href: "/dashboard" },
  solicitudes: { label: "Solicitudes", href: "/solicitudes" },
  panel: { label: "Panel global", href: "/panel" },
  diseno: { label: "Diseño", href: "/diseno" },
  campanas: { label: "Campañas", href: "/campanas" },
  usuarios: { label: "Usuarios", href: "/usuarios" },
};

export function getNavItemsForRole(rol: string | null | undefined): NavItem[] {
  const isAdmin = rol === "admin";
  const isMarketing = rol === "marketing";
  const isDiseno = rol === "disenador";
  const isComercial = rol === "comercial_nacional" || rol === "comercial_exportacion";
  const isResp = rol === "responsable_nacional" || rol === "responsable_exportacion";
  const isRespDiseno = rol === "responsable_diseno";

  const ids: NavItemId[] = [];
  if (isAdmin || isMarketing || isResp) ids.push("dashboard");
  if (isAdmin || isMarketing || isComercial || isResp) ids.push("solicitudes");
  if (isAdmin || isMarketing) ids.push("panel");
  if (isAdmin || isMarketing || isDiseno || isRespDiseno) ids.push("diseno");
  if (isAdmin || isMarketing) ids.push("campanas");
  if (isAdmin || isMarketing) ids.push("usuarios");

  return ids.map((id) => ({ id, ...NAV_DEFS[id] }));
}

// Réplica del <select id="impersonate-rol"> (~542-553): mismas opciones,
// mismo orden. No incluye "admin" ni los roles genéricos sin sufijo de
// canal (UI-10).
export const IMPERSONATABLE_ROLES: { value: string; label: string }[] = [
  { value: "marketing", label: "Marketing" },
  { value: "disenador", label: "Diseñador" },
  { value: "comercial_nacional", label: "Comercial Nacional" },
  { value: "comercial_exportacion", label: "Comercial Exportación" },
  { value: "responsable_nacional", label: "Resp. Nacional" },
  { value: "responsable_exportacion", label: "Resp. Exportación" },
  { value: "responsable_diseno", label: "Resp. Diseño" },
];

// Réplica de ROL_LABELS (~2309). H-07 (cerrado 2026-08-04): sin los roles
// legacy genéricos `comercial`/`responsable` — no existe ningún usuario real
// con esos roles.
export const ROL_LABELS: Record<string, string> = {
  responsable_diseno: "Resp. Diseño",
  admin: "Administrador",
  marketing: "Marketing",
  responsable_nacional: "Resp. Nacional",
  responsable_exportacion: "Resp. Exportación",
  comercial_nacional: "Comercial Nacional",
  comercial_exportacion: "Comercial Exportación",
  disenador: "Diseñador",
};
