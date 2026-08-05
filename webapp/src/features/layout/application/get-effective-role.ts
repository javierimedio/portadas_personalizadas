import { cookies } from "next/headers";
import { IMPERSONATION_COOKIE } from "../domain/impersonation";

// Resuelve la laguna dejada en el bloque de Layout (docs/09-matriz-paridad-
// funcional.md § UI-10): la impersonación solo afectaba al nav pintado en
// el cliente. Las páginas que consultan datos en el servidor (el Dashboard)
// necesitan saber el rol "efectivo" también — vía esta cookie, que
// AppShell actualiza al cambiar el selector. Solo tiene efecto si el rol
// real es admin, igual que el original solo permite impersonar desde ahí.
export async function getEffectiveRole(realRol: string | null): Promise<string | null> {
  if (realRol !== "admin") return realRol;
  const store = await cookies();
  const impersonated = store.get(IMPERSONATION_COOKIE)?.value;
  return impersonated || realRol;
}
