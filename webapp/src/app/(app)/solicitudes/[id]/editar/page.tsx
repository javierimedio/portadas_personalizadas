import { notFound, redirect } from "next/navigation";
import { requireRouteAccess } from "@/features/layout/application/require-route-access";
import { getEffectiveRole } from "@/features/layout/application/get-effective-role";
import { getSolicitudFormData } from "@/features/solicitudes/application/get-solicitud-form-data";
import { SolicitudForm } from "@/features/solicitudes/ui/solicitud-form";

// Réplica de openFormModal() con solId (index.html ~2675-2808). requireRouteAccess
// comprueba contra "/solicitudes" (no contra el pathname real, que es
// anidado) porque nav-items.ts solo conoce rutas de primer nivel — ver
// require-route-access.ts.
export default async function EditarSolicitudPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rol = await requireRouteAccess("/solicitudes");
  const effectiveRol = await getEffectiveRole(rol);
  const data = await getSolicitudFormData(id);
  if (!data.solicitud) notFound();

  // Réplica de renderComercialTable() (~2116): "Editar" solo se ofrece para
  // solicitudes en borrador — el resto de estados solo tienen "Ver"
  // (detalle de la solicitud, bloque posterior).
  if (data.solicitud.estado !== "borrador") {
    redirect("/solicitudes");
  }

  return (
    <div>
      <div className="section-title">Editar solicitud</div>
      <div className="section-sub">Cód. SAP {data.solicitud.cod_sap}</div>
      <div className="card">
        <SolicitudForm
          campanas={data.campanas}
          perfiles={data.perfiles}
          defaultCampanaId={data.defaultCampanaId}
          rol={effectiveRol}
          solicitud={data.solicitud}
        />
      </div>
    </div>
  );
}
