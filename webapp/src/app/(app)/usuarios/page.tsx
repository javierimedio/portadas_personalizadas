import { requireRouteAccess } from "@/features/layout/application/require-route-access";

export default async function UsuariosPage() {
  await requireRouteAccess("/usuarios");
  return (
    <p className="text-sm text-neutral-500">
      Usuarios — pendiente de migrar (Fase 4, docs/06-roadmap.md).
    </p>
  );
}
