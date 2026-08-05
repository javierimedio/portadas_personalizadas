import { requireRouteAccess } from "@/features/layout/application/require-route-access";
import { getUsuarios } from "@/features/usuarios/application/get-usuarios";
import { UsuariosPageClient } from "@/features/usuarios/ui/usuarios-page";

// Réplica de #page-usuarios (index.html ~725-776). USR-01 a USR-15 de
// docs/09-matriz-paridad-funcional.md.
export default async function UsuariosPage() {
  const rol = await requireRouteAccess("/usuarios");
  const perfiles = await getUsuarios();
  return <UsuariosPageClient perfiles={perfiles} rol={rol} />;
}
