import { requireRouteAccess } from "@/features/layout/application/require-route-access";
import { getEffectiveRole } from "@/features/layout/application/get-effective-role";
import { getDashboardData } from "@/features/dashboard/application/get-dashboard-data";
import { CampanaSelector } from "@/features/dashboard/ui/campana-selector";
import { KpiCards } from "@/features/dashboard/ui/kpi-cards";
import { Progreso } from "@/features/dashboard/ui/progreso";
import { EstadoChart } from "@/features/dashboard/ui/charts/estado-chart";
import { HorizontalBarChart } from "@/features/dashboard/ui/charts/horizontal-bar-chart";
import { UnidadesCatalogoChart } from "@/features/dashboard/ui/charts/unidades-catalogo-chart";
import { PortadasChart } from "@/features/dashboard/ui/charts/portadas-chart";
import { TipoChart } from "@/features/dashboard/ui/charts/tipo-chart";
import { UnidadesIdiomaChart } from "@/features/dashboard/ui/charts/unidades-idioma-chart";

// Réplica de #page-dashboard / renderDashboard() (index.html ~777-854,
// ~4189-4529). DASH-01 a DASH-15 de docs/09-matriz-paridad-funcional.md.
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ campana?: string }>;
}) {
  const rol = await requireRouteAccess("/dashboard");
  const effectiveRol = await getEffectiveRole(rol);
  const { campana } = await searchParams;
  const dash = await getDashboardData(effectiveRol, campana);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-lg font-bold">Dashboard</div>
          <div className="text-sm text-neutral-500">{dash.kpis.campanaLabel}</div>
        </div>
        <CampanaSelector campanas={dash.campanas} selected={dash.campanaSeleccionada} />
      </div>

      <KpiCards estado={dash.kpis.estado} unidades={dash.kpis.unidades} precios={dash.kpis.precios} />

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 p-4">
          <div className="mb-2 text-sm font-bold">Estado de solicitudes</div>
          <div className="relative h-56">
            <EstadoChart {...dash.estadoChart} total={dash.kpis.total} />
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 p-4">
          <div className="mb-2 text-sm font-bold">Solicitudes por comercial</div>
          <div className="relative h-56">
            <HorizontalBarChart
              labels={dash.comercialesChart.labels}
              counts={dash.comercialesChart.counts}
              color="#003087"
            />
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 p-4">
          <div className="mb-2 text-sm font-bold">Solicitudes por idioma</div>
          <div className="relative h-52">
            <HorizontalBarChart
              labels={dash.idiomasChart.labels}
              counts={dash.idiomasChart.counts}
              color="#BA7517"
            />
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 p-4">
          <div className="mb-2 text-sm font-bold">Unidades por catálogo / idioma</div>
          <div className="relative h-52">
            <UnidadesIdiomaChart {...dash.unidadesIdiomaChart} />
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 p-4">
          <div className="mb-2 text-sm font-bold">Unidades por catálogo</div>
          <div className="relative h-48">
            <UnidadesCatalogoChart {...dash.unidadesChart} />
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 p-4">
          <div className="mb-2 text-sm font-bold">Portada personalizada</div>
          <div className="relative h-48">
            <PortadasChart {...dash.portadasChart} />
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 p-4">
          <div className="mb-2 text-sm font-bold">Catálogo digital vs impreso</div>
          <div className="relative h-48">
            <TipoChart {...dash.tipoChart} />
          </div>
        </div>
      </div>

      <Progreso steps={dash.progreso} />
    </div>
  );
}
