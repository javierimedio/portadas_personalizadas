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
// Usa las clases .card/.card-title/.section-title/.section-sub/.dash-grid-2/
// .dash-grid-3 portadas en globals.css — misma estructura, mismos huecos de
// altura de gráfico (220px / 200px) que index.html.
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div className="section-title">Dashboard</div>
          <div className="section-sub" style={{ marginBottom: 0 }}>
            {dash.kpis.campanaLabel}
          </div>
        </div>
        <CampanaSelector campanas={dash.campanas} selected={dash.campanaSeleccionada} />
      </div>

      <KpiCards estado={dash.kpis.estado} unidades={dash.kpis.unidades} precios={dash.kpis.precios} />

      <div className="dash-grid-2" style={{ marginBottom: "1rem" }}>
        <div className="card">
          <div className="card-title">Estado de solicitudes</div>
          <div style={{ position: "relative", height: 220, overflow: "hidden" }}>
            <EstadoChart {...dash.estadoChart} total={dash.kpis.total} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">Solicitudes por comercial</div>
          <div style={{ position: "relative", height: 220, overflow: "hidden" }}>
            <HorizontalBarChart
              labels={dash.comercialesChart.labels}
              counts={dash.comercialesChart.counts}
              color="#003087"
            />
          </div>
        </div>
      </div>

      <div className="dash-grid-2" style={{ marginBottom: "1rem" }}>
        <div className="card">
          <div className="card-title">Solicitudes por idioma</div>
          <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
            <HorizontalBarChart
              labels={dash.idiomasChart.labels}
              counts={dash.idiomasChart.counts}
              color="#BA7517"
            />
          </div>
        </div>
        <div className="card">
          <div className="card-title">Unidades por catálogo / idioma</div>
          <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
            <UnidadesIdiomaChart {...dash.unidadesIdiomaChart} />
          </div>
        </div>
      </div>

      <div className="dash-grid-3" style={{ marginBottom: "1rem" }}>
        <div className="card">
          <div className="card-title">Unidades por catálogo</div>
          <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
            <UnidadesCatalogoChart {...dash.unidadesChart} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">Portada personalizada</div>
          <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
            <PortadasChart {...dash.portadasChart} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">Catálogo digital vs impreso</div>
          <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
            <TipoChart {...dash.tipoChart} />
          </div>
        </div>
      </div>

      <Progreso steps={dash.progreso} />
    </div>
  );
}
