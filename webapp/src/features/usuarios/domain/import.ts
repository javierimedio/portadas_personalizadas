export type ImportUsuario = { email: string; nombre: string; pass: string; rol: string; codigo: string };

// Réplica de los roles válidos de processImportFile() (~5695), ampliada
// (H-13): el original solo aceptaba comercial/marketing/disenador/admin —
// ni siquiera las variantes con sufijo de canal (comercial_nacional/
// exportacion, responsable_nacional/exportacion, responsable_diseno) que
// son las que de verdad existen y se usan en el resto de la aplicación
// (nav-items.ts, RLS) — con la lista original, importar un comercial o un
// responsable reales se marcaba como inválido.
//
// H-07 (cerrado 2026-08-04, confirmado por el propietario del proyecto
// contra datos reales de producción): el rol legacy `comercial` genérico
// (sin sufijo de canal) no tiene ningún usuario real ni ningún caso de uso
// vigente — se elimina de la lista de roles válidos, junto con el resto del
// código de compatibilidad con roles legacy en toda la aplicación.
export const VALID_IMPORT_ROLES = [
  "comercial_nacional",
  "comercial_exportacion",
  "responsable_nacional",
  "responsable_exportacion",
  "responsable_diseno",
  "marketing",
  "disenador",
  "admin",
];

// Réplica de processImportFile() (~5673-5688): la fila 0 se salta si su
// primera celda parece cabecera ("email"); columnas fijas por posición
// (email, nombre, password, rol, código); solo se conservan filas con
// email+nombre+pass. A diferencia del original (que en una fila sin rol
// asignaba por defecto el rol legacy `comercial`, hoy inexistente y sin
// nav propio — H-07), una fila sin rol se deja vacía a propósito: `rolValido`
// la marca como inválida en la previsualización en vez de crear en
// silencio un usuario con un rol roto.
export function parseImportRows(rows: unknown[][]): ImportUsuario[] {
  if (!rows.length) return [];
  const primeraCelda = String(rows[0]?.[0] ?? "").toLowerCase();
  const start = primeraCelda.includes("email") ? 1 : 0;

  return rows
    .slice(start)
    .filter((r) => r[0])
    .map((r) => ({
      email: String(r[0] ?? "").trim(),
      nombre: String(r[1] ?? "").trim(),
      pass: String(r[2] ?? "").trim(),
      rol: String(r[3] ?? "").trim().toLowerCase(),
      codigo: String(r[4] ?? "").trim(),
    }))
    .filter((u) => u.email && u.nombre && u.pass);
}

export function rolValido(rol: string): boolean {
  return VALID_IMPORT_ROLES.includes(rol);
}
