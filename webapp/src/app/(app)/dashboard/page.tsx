import { requireRouteAccess } from "@/features/layout/application/require-route-access";

export default async function DashboardPage() {
  await requireRouteAccess("/dashboard");
  return (
    <p className="text-sm text-neutral-500">
      Dashboard — KPIs y gráficos pendientes de migrar (siguiente bloque de la Fase 1,
      docs/06-roadmap.md).
    </p>
  );
}
