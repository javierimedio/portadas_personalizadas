// Nombre de la cookie compartido entre el cliente (AppShell, la escribe) y
// el servidor (get-effective-role.ts, la lee) — en un archivo aparte sin
// imports de "next/headers" porque AppShell es un Client Component y no
// puede tirar de ese módulo, ni siquiera solo por esta constante.
export const IMPERSONATION_COOKIE = "impersonated_rol";
