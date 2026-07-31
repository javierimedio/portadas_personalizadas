// Tipo de resultado común para los casos de uso (Server Actions) — evita que
// cada acción invente su propia forma de reportar éxito/error a la UI.
export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err<T>(error: string): Result<T> {
  return { ok: false, error };
}
