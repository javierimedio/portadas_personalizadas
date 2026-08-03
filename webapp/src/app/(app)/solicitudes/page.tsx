import { requireRouteAccess } from "@/features/layout/application/require-route-access";

export default async function SolicitudesPage() {
  await requireRouteAccess("/solicitudes");
  return (
    <p className="text-sm text-neutral-500">
      Solicitudes — pendiente de migrar (Fase 2, docs/06-roadmap.md).
    </p>
  );
}
