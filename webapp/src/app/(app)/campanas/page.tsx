import { requireRouteAccess } from "@/features/layout/application/require-route-access";

export default async function CampanasPage() {
  await requireRouteAccess("/campanas");
  return (
    <p className="text-sm text-neutral-500">
      Campañas — pendiente de migrar (Fase 3, docs/06-roadmap.md).
    </p>
  );
}
