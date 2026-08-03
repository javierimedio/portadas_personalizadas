import { requireRouteAccess } from "@/features/layout/application/require-route-access";

export default async function PanelPage() {
  await requireRouteAccess("/panel");
  return (
    <p className="text-sm text-neutral-500">
      Panel global — pendiente de migrar (Fase 5, docs/06-roadmap.md).
    </p>
  );
}
