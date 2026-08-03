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
      <h1 className="text-lg font-bold text-neutral-900">Nueva contraseña</h1>
      <p className="mt-1 text-sm text-neutral-500">Introduce tu nueva contraseña</p>

      <form action={formAction} className="mt-4 space-y-3">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-neutral-700">
            Nueva contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Mín. 8 caracteres"
            autoComplete="new-password"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="password2" className="mb-1 block text-sm font-medium text-neutral-700">
            Confirmar contraseña
          </label>
          <input
            id="password2"
            name="password2"
            type="password"
            placeholder="Repite la contraseña"
            autoComplete="new-password"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>

        {state?.error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
        )}
        {state?.success && (
          <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            ¡Contraseña actualizada correctamente! Redirigiendo al login...
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Guardar nueva contraseña
        </button>
      </form>
    </div>
  );
}
