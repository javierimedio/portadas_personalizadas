"use client";

import { useEffect } from "react";

// Corrige H-05: el original, si `initApp()` fallaba tras un login correcto,
// solo ocultaba el loader y hacía `console.error`, sin ningún mensaje visible
// — la app quedaba en blanco sin que la persona supiera por qué. Decisión
// explícita del propietario del proyecto (2026-08-04): no replicar ese
// fallo silencioso. Este error boundary de Next.js cubre el equivalente
// exacto de "tras el login" — cualquier error al renderizar algo dentro de
// (app) (layout o cualquier página), incluidos los fallos de carga de datos
// desde Supabase que antes habría absorbido `initApp()`.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="empty-state" style={{ padding: "4rem 1rem" }}>
      <div className="icon">⚠️</div>
      <p style={{ fontSize: 15, fontWeight: 600, color: "var(--c-dark)", marginBottom: ".5rem" }}>
        No ha sido posible cargar la aplicación.
      </p>
      <p style={{ marginBottom: "1.25rem" }}>Vuelve a intentarlo; si el problema persiste, contacta con soporte.</p>
      <button type="button" className="btn btn-amber" onClick={() => reset()}>
        Reintentar
      </button>
    </div>
  );
}
