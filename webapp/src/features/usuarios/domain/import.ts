export type ImportUsuario = { email: string; nombre: string; pass: string; rol: string; codigo: string };

// Réplica de los roles válidos de processImportFile() (~5695), ampliada
// (H-13): el original solo aceptaba comercial/marketing/disenador/admin —
// ni siquiera las variantes con sufijo de canal (comercial_nacional/
// exportacion, responsable_nacional/exportacion, responsable_diseno) que
// son las que de verdad existen y se usan en el resto de la aplicación
// (nav-items.ts, RLS) — con la lista original, importar un comercial o un
// responsable reales se marcaba como inválido. No se quita nada de la
// lista original (incluido el `comercial` genérico, sin nav propio según
// H-07, que sigue siendo el valor por defecto si la columna de rol viene
// vacía) — solo se añaden los roles reales que faltaban.
export const VALID_IMPORT_ROLES = [
  "comercial",
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
// email+nombre+pass.
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
      rol: String(r[3] ?? "").trim().toLowerCase() || "comercial",
      codigo: String(r[4] ?? "").trim(),
    }))
    .filter((u) => u.email && u.nombre && u.pass);
}

export function rolValido(rol: string): boolean {
  return VALID_IMPORT_ROLES.includes(rol);
}
