import { requireRouteAccess } from "@/features/layout/application/require-route-access";
import { getCampanas } from "@/features/campanas/application/get-campanas";
import { CampanasPageClient } from "@/features/campanas/ui/campanas-page";

// Adelanto acotado de Fase 3 (docs/06-roadmap.md): solo lo necesario para
// que marketing/admin puedan gestionar el PDF de instrucciones por
// catálogo y por idioma (cambio funcional solicitado desde Solicitudes).
// Sin "Usar como activa" ni "Eliminar campaña" — quedan para Fase 3.
export default async function CampanasPage() {
  await requireRouteAccess("/campanas");
  const campanas = await getCampanas();
  return <CampanasPageClient campanas={campanas} />;
}
