"use client";

import { useActionState, useState } from "react";
import { login, type LoginState } from "../application/login.action";
import {
  requestPasswordReset,
  type ResetState,
} from "../application/request-password-reset.action";

// Réplica de la tarjeta #auth-screen de index.html (~455-484): mismos campos,
// mismo botón con spinner (AUT-03), y el formulario de recuperación oculto
// hasta pulsar "¿Olvidaste tu contraseña?" (AUT-05).
export function LoginForm() {
  const [loginState, loginAction, loginPending] = useActionState<LoginState, FormData>(
    login,
    null
  );
  const [showReset, setShowReset] = useState(false);
  const [resetState, resetAction, resetPending] = useActionState<ResetState, FormData>(
    requestPasswordReset,
    null
  );

  return (
    <div>
      <h1 className="text-xl font-bold text-neutral-900">Portadas Personalizadas</h1>
      <p className="mt-1 text-sm text-neutral-500">Accede con tu correo corporativo</p>

      {loginState?.error && (
        <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {loginState.error}
        </div>
      )}

      <form action={loginAction} className="mt-4 space-y-3">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-neutral-700">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="tu@gorfactory.com"
            autoComplete="email"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-neutral-700">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loginPending}
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loginPending ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setShowReset(true)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      {showReset && (
        <form action={resetAction} className="mt-3 space-y-2">
          <input
            name="email"
            type="email"
            placeholder="Introduce tu correo"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={resetPending}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 disabled:opacity-60"
          >
            Enviar enlace de recuperación
          </button>
          {resetState?.sent && (
            <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              Si el correo existe, recibirás un enlace de recuperación.
            </div>
          )}
        </form>
      )}
    </div>
  );
}
