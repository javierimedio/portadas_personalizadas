import { requireRouteAccess } from "@/features/layout/application/require-route-access";
import { PlaceholderPage } from "@/features/layout/ui/placeholder-page";

export default async function CampanasPage() {
  await requireRouteAccess("/campanas");
  return <PlaceholderPage titulo="Campañas" mensaje="Pendiente de migrar (Fase 3, docs/06-roadmap.md)." />;
}
