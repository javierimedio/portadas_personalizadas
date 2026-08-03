import { requireRouteAccess } from "@/features/layout/application/require-route-access";
import { PlaceholderPage } from "@/features/layout/ui/placeholder-page";

export default async function DisenoPage() {
  await requireRouteAccess("/diseno");
  return <PlaceholderPage titulo="Diseño" mensaje="Pendiente de migrar (Fase 2, docs/06-roadmap.md)." />;
}
