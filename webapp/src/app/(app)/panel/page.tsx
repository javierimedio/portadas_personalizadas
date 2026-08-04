import { cookies } from "next/headers";
import { requireRouteAccess } from "@/features/layout/application/require-route-access";
import { getEffectiveRole } from "@/features/layout/application/get-effective-role";
import { getSolicitudesList } from "@/features/solicitudes/application/get-solicitudes-list";
import { PanelGlobalPage } from "@/features/panel-global/ui/panel-global-page";
import { ACTIVE_CAMPANA_COOKIE } from "@/features/campanas/domain/active-campana";
import { activeCampanaId } from "@/shared/domain/campanas";

// Réplica de #page-panel (index.html ~644-693). PAN-01 a PAN-15 de
// docs/09-matriz-paridad-funcional.md.
export default async function PanelPage() {
  const rol = await requireRouteAccess("/panel");
  const effectiveRol = await getEffectiveRole(rol);
  const data = await getSolicitudesList(effectiveRol);
  const cookieStore = await cookies();
  const defaultCampanaId = activeCampanaId(data.campanas, cookieStore.get(ACTIVE_CAMPANA_COOKIE)?.value);

  return (
    <div>
      <div className="section-title">Panel Global</div>
      <div className="section-sub">Gestión centralizada de todas las solicitudes de portadas. Revisa, adjudica y envía a diseño.</div>
      <PanelGlobalPage rows={data.rows} campanas={data.campanas} perfiles={data.perfiles} defaultCampanaId={defaultCampanaId} rol={effectiveRol} />
    </div>
  );
}
