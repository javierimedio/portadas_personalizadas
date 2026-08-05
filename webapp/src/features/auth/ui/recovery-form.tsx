"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  updatePassword,
  type UpdatePasswordState,
} from "../application/update-password.action";

// Réplica de #recovery-screen de index.html (~500-518) y doRecovery()
// (~1669-1712): mismas validaciones/mensajes (AUT-08) y misma redirección
// temporizada a los 2s tras el éxito (AUT-09).
export function RecoveryForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<UpdatePasswordState, FormData>(
    updatePassword,
    null
  );

  useEffect(() => {
    if (!state?.success) return;
    const timer = setTimeout(() => router.push("/login"), 2000);
    return () => clearTimeout(timer);
  }, [state, router]);

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--c-dark)" }}>Nueva contraseña</div>
      <div style={{ fontSize: 13, color: "var(--c-mid)", marginTop: 4, marginBottom: "1rem" }}>
        Introduce tu nueva contraseña
      </div>

      <form action={formAction}>
        <div className="form-group" style={{ marginBottom: "1rem" }}>
          <label htmlFor="password">Nueva contraseña</label>
          <input id="password" name="password" type="password" placeholder="Mín. 8 caracteres" autoComplete="new-password" />
        </div>
        <div className="form-group" style={{ marginBottom: "1.5rem" }}>
          <label htmlFor="password2">Confirmar contraseña</label>
          <input
            id="password2"
            name="password2"
            type="password"
            placeholder="Repite la contraseña"
            autoComplete="new-password"
          />
        </div>

        {state?.error && <div className="alert alert-error" style={{ marginBottom: "1rem" }}>{state.error}</div>}
        {state?.success && (
          <div className="alert alert-success" style={{ marginBottom: "1rem" }}>
            ¡Contraseña actualizada correctamente! Redirigiendo al login...
          </div>
        )}

        <button type="submit" disabled={pending} className="btn btn-amber" style={{ width: "100%", justifyContent: "center" }}>
          Guardar nueva contraseña
        </button>
      </form>
    </div>
  );
}
