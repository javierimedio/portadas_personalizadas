import { cookies } from "next/headers";
import { requireRouteAccess } from "@/features/layout/application/require-route-access";
import { getCampanas } from "@/features/campanas/application/get-campanas";
import { CampanasPageClient } from "@/features/campanas/ui/campanas-page";
import { ACTIVE_CAMPANA_COOKIE } from "@/features/campanas/domain/active-campana";
import { activeCampanaId } from "@/shared/domain/campanas";

// Réplica de #page-campanas (index.html ~630-641, ~4899-5098). CAMP-01 a
// CAMP-16 de docs/09-matriz-paridad-funcional.md.
export default async function CampanasPage() {
  await requireRouteAccess("/campanas");
  const campanas = await getCampanas();
  const cookieStore = await cookies();
  const activeId = activeCampanaId(campanas, cookieStore.get(ACTIVE_CAMPANA_COOKIE)?.value);
  return <CampanasPageClient campanas={campanas} activeCampanaId={activeId} />;
}
