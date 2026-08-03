import { requireRouteAccess } from "@/features/layout/application/require-route-access";

export default async function DisenoPage() {
  await requireRouteAccess("/diseno");
  return (
    <p className="text-sm text-neutral-500">
      Diseño — pendiente de migrar (Fase 2, docs/06-roadmap.md).
    </p>
  );
}
