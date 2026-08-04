// Nombre de la cookie que guarda la campaña "activa" elegida en sesión
// (CAMP-01/CAMP-05, distinta del flag `activa` de la campaña — CAMP-04). En
// un archivo aparte sin imports de "next/headers" para poder importarlo
// tanto desde Server Components/Actions como desde el Client Component que
// la escribe (mismo patrón que IMPERSONATION_COOKIE).
export const ACTIVE_CAMPANA_COOKIE = "active_campana_id";
