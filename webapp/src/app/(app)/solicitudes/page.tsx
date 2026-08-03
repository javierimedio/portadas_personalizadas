import { requireRouteAccess } from "@/features/layout/application/require-route-access";
import { getEffectiveRole } from "@/features/layout/application/get-effective-role";
import { getSolicitudesList } from "@/features/solicitudes/application/get-solicitudes-list";
import { SolicitudesTable } from "@/features/solicitudes/ui/solicitudes-table";

// Réplica de #page-mis-solicitudes (index.html ~578-642). SOL-01 a SOL-10,
// SOL-24 de docs/09-matriz-paridad-funcional.md.
export default async function SolicitudesPage() {
  const rol = await requireRouteAccess("/solicitudes");
  const effectiveRol = await getEffectiveRole(rol);
  const data = await getSolicitudesList(effectiveRol);

  return (
    <div>
      <div className="section-title">Mis solicitudes</div>
      <div className="section-sub">Crea y gestiona las solicitudes de portada para tus clientes.</div>
      <SolicitudesTable
        rows={data.rows}
        campanas={data.campanas}
        defaultCampanaId={data.defaultCampanaId}
        rol={effectiveRol}
      />
    </div>
  );
}
