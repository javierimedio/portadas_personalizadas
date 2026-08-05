import { cookies } from "next/headers";
import { requireRouteAccess } from "@/features/layout/application/require-route-access";
import { getEffectiveRole } from "@/features/layout/application/get-effective-role";
import { getSolicitudesList } from "@/features/solicitudes/application/get-solicitudes-list";
import { MisSolicitudes } from "@/features/solicitudes/ui/mis-solicitudes";
import { ACTIVE_CAMPANA_COOKIE } from "@/features/campanas/domain/active-campana";
import { activeCampanaId } from "@/shared/domain/campanas";

// Réplica de #page-mis-solicitudes y #modal-solicitud (index.html ~578-642,
// ~1017-1196). SOL-01 a SOL-24, EST-01 (parcial) de
// docs/09-matriz-paridad-funcional.md.
export default async function SolicitudesPage() {
  const rol = await requireRouteAccess("/solicitudes");
  const effectiveRol = await getEffectiveRole(rol);
  const data = await getSolicitudesList(effectiveRol);
  const cookieStore = await cookies();
  // CAMP-15: la campaña "activa" (sesión, no persistida) es la misma en
  // todos los selectores de la app — ver activeCampanaId().
  const defaultCampanaId = activeCampanaId(data.campanas, cookieStore.get(ACTIVE_CAMPANA_COOKIE)?.value);

  return (
    <div>
      <div className="section-title">Mis solicitudes</div>
      <div className="section-sub">Crea y gestiona las solicitudes de portada para tus clientes.</div>
      <MisSolicitudes
        rows={data.rows}
        campanas={data.campanas}
        perfiles={data.perfiles}
        defaultCampanaId={defaultCampanaId}
        rol={effectiveRol}
      />
    </div>
  );
}
