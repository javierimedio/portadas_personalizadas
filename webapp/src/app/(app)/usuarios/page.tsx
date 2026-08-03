import { requireRouteAccess } from "@/features/layout/application/require-route-access";
import { PlaceholderPage } from "@/features/layout/ui/placeholder-page";

export default async function UsuariosPage() {
  await requireRouteAccess("/usuarios");
  return <PlaceholderPage titulo="Usuarios" mensaje="Pendiente de migrar (Fase 4, docs/06-roadmap.md)." />;
}
