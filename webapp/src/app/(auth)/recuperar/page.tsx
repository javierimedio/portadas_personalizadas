import { createClient } from "@/shared/infrastructure/supabase/server-client";
import { RecoveryForm } from "@/features/auth/ui/recovery-form";

// Destino del enlace de recuperación (AUT-07). /auth/confirm ya intercambió
// el código por una sesión antes de llegar aquí; si no hay sesión válida —
// enlace caducado, ya usado, o acceso directo a esta URL sin token — se
// muestra el mismo mensaje que index.html cuando `window._recoveryToken` no
// existe (~1686).
export default async function RecuperarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (error || !data.user) {
    return (
      <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
        Token de recuperación no válido. Solicita un nuevo enlace.
      </div>
    );
  }

  return <RecoveryForm />;
}
