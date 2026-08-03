import { createClient } from "@/shared/infrastructure/supabase/server-client";
import { RecoveryForm } from "@/features/auth/ui/recovery-form";

// Réplica visual de #recovery-screen (index.html ~500-518): fondo claro
// (heredado del body — la variable CSS `--c-bg` que usaba el original no
// llega a estar definida en ningún sitio, así que en producción también
// se ve el fondo claro del body, no uno propio), tarjeta blanca centrada
// con el logo GOR Factory arriba. El original usa ahí la variante blanca
// del logo (GORFACTORY_LOGO_BLANCO.png) sobre una tarjeta blanca, donde
// queda invisible — corregido aquí usando la variante oscura, que es
// claramente la intención visual, no el comportamiento a preservar.
export default async function RecuperarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/GORFACTORY_LOGO.png" alt="GOR Factory" className="mx-auto mb-4 h-8" />
        </div>

        {error || !data.user ? (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            Token de recuperación no válido. Solicita un nuevo enlace.
          </div>
        ) : (
          <RecoveryForm />
        )}
      </div>
    </div>
  );
}
