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
      <div style={{ background: "white", borderRadius: 12, padding: "2rem", width: "100%", maxWidth: 400, boxShadow: "0 4px 24px rgba(0,0,0,.1)" }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/GORFACTORY_LOGO.png" alt="GOR Factory" style={{ height: 32, marginBottom: "1rem", margin: "0 auto 1rem" }} />
        </div>

        {error || !data.user ? (
          <div className="alert alert-error">Token de recuperación no válido. Solicita un nuevo enlace.</div>
        ) : (
          <RecoveryForm />
        )}
      </div>
    </div>
  );
}
