import { requireRouteAccess } from "@/features/layout/application/require-route-access";
import { PlaceholderPage } from "@/features/layout/ui/placeholder-page";

export default async function PanelPage() {
  await requireRouteAccess("/panel");
  return <PlaceholderPage titulo="Panel global" mensaje="Pendiente de migrar (Fase 5, docs/06-roadmap.md)." />;
}
