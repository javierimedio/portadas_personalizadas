import { createClient } from "@/shared/infrastructure/supabase/server-client";
import { requireRouteAccess } from "@/features/layout/application/require-route-access";
import { getEffectiveRole } from "@/features/layout/application/get-effective-role";
import { getSolicitudesList } from "@/features/solicitudes/application/get-solicitudes-list";
import { DisenoPage } from "@/features/diseno/ui/diseno-page";

// Réplica de #page-diseno (index.html ~696-720). DIS-01 a DIS-10 de
// docs/09-matriz-paridad-funcional.md.
export default async function Diseno() {
  const rol = await requireRouteAccess("/diseno");
  const effectiveRol = await getEffectiveRole(rol);
  const data = await getSolicitudesList(effectiveRol);
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  return (
    <div>
      <div className="section-title">Diseño</div>
      <div className="section-sub">Solicitudes en proceso de diseño.</div>
      <DisenoPage
        rows={data.rows}
        campanas={data.campanas}
        perfiles={data.perfiles}
        defaultCampanaId={data.defaultCampanaId}
        rol={effectiveRol}
        currentUserId={userData.user?.id ?? null}
      />
    </div>
  );
}
