import { requireRouteAccess } from "@/features/layout/application/require-route-access";
import { PlaceholderPage } from "@/features/layout/ui/placeholder-page";

export default async function SolicitudesPage() {
  await requireRouteAccess("/solicitudes");
  return <PlaceholderPage titulo="Solicitudes" mensaje="Pendiente de migrar (Fase 2, docs/06-roadmap.md)." />;
}
