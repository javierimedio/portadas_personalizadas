"use client";

import { useActionState, useState } from "react";
import { login, type LoginState } from "../application/login.action";
import {
  requestPasswordReset,
  type ResetState,
} from "../application/request-password-reset.action";

// Réplica de la tarjeta #auth-screen de index.html (~455-484): mismos campos,
// mismo botón con spinner (AUT-03), y el formulario de recuperación oculto
// hasta pulsar "¿Olvidaste tu contraseña?" (AUT-05). Usa .auth-title/
// .auth-sub/.form-group/.btn de globals.css — paridad visual, no solo
// funcional.
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
      <div className="auth-title">Portadas Personalizadas</div>
      <div className="auth-sub">Accede con tu correo corporativo</div>

      {loginState?.error && <div className="alert alert-error" style={{ marginBottom: "1rem" }}>{loginState.error}</div>}

      <form action={loginAction}>
        <div className="form-group" style={{ marginBottom: ".75rem" }}>
          <label htmlFor="email">Correo electrónico</label>
          <input id="email" name="email" type="email" placeholder="tu@gorfactory.com" autoComplete="email" />
        </div>
        <div className="form-group" style={{ marginBottom: "1.25rem" }}>
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>
        <button type="submit" disabled={loginPending} className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
          {loginPending ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <div style={{ marginTop: "1rem", textAlign: "center" }}>
        <button
          type="button"
          onClick={() => setShowReset(true)}
          className="btn btn-outline btn-sm"
          style={{ width: "100%", justifyContent: "center" }}
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      {showReset && (
        <form action={resetAction} style={{ marginTop: "1rem" }}>
          <input
            name="email"
            type="email"
            placeholder="Introduce tu correo"
            style={{ width: "100%", marginBottom: ".5rem" }}
          />
          <button type="submit" disabled={resetPending} className="btn btn-outline btn-sm" style={{ width: "100%", justifyContent: "center" }}>
            Enviar enlace de recuperación
          </button>
          {resetState?.sent && (
            <div className="alert alert-success" style={{ marginTop: ".5rem" }}>
              Si el correo existe, recibirás un enlace de recuperación.
            </div>
          )}
        </form>
      )}
    </div>
  );
}
