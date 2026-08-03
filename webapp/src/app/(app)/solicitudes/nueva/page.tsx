import { requireRouteAccess } from "@/features/layout/application/require-route-access";
import { getEffectiveRole } from "@/features/layout/application/get-effective-role";
import { getSolicitudFormData } from "@/features/solicitudes/application/get-solicitud-form-data";
import { SolicitudForm } from "@/features/solicitudes/ui/solicitud-form";

// Réplica de openFormModal() sin solId (index.html ~2675-2808, SOL-01/02).
export default async function NuevaSolicitudPage() {
  const rol = await requireRouteAccess("/solicitudes");
  const effectiveRol = await getEffectiveRole(rol);
  const data = await getSolicitudFormData(null);

  return (
    <div>
      <div className="section-title">Nueva solicitud</div>
      <div className="section-sub">Crea una solicitud de portada personalizada para un cliente.</div>
      <div className="card">
        <SolicitudForm
          campanas={data.campanas}
          perfiles={data.perfiles}
          defaultCampanaId={data.defaultCampanaId}
          rol={effectiveRol}
          solicitud={null}
        />
      </div>
    </div>
  );
}
