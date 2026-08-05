"use client";

import { useActionState, useEffect, useState } from "react";
import { useToast } from "@/shared/ui/toast";
import { passwordStrength } from "../domain/password-strength";
import { updatePerfilPassword, type UpdatePerfilPasswordState } from "../application/update-password.action";

// Réplica de la card "Cambiar contraseña" (index.html ~921-948): medidor de
// fortaleza en tiempo real (PERF-09), botón de mostrar/ocultar (PERF-10),
// botón con texto de progreso (PERF-12). El `key` del <form> cambia tras un
// éxito para forzar que React desmonte los inputs no controlados y queden
// vacíos, igual que el original limpia los campos a mano.
export function PasswordForm() {
  const [state, formAction, pending] = useActionState<UpdatePerfilPasswordState, FormData>(
    updatePerfilPassword,
    null
  );
  const [pwd1, setPwd1] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!state?.success) return;
    toast("Contraseña actualizada.");
    setPwd1("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const strength = passwordStrength(pwd1);

  return (
    <div className="card" style={{ marginBottom: "1rem" }}>
      <div className="card-title">Cambiar contraseña</div>
      {state?.error && (
        <div className="alert alert-error" style={{ marginBottom: ".75rem" }}>
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="alert alert-success" style={{ marginBottom: ".75rem" }}>
          Contraseña actualizada correctamente.
        </div>
      )}
      <form
        key={state?.success ? "reset" : "form"}
        action={formAction}
        style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}
      >
        <div>
          <label className="field-label" htmlFor="perfil-pwd1">
            Nueva contraseña
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="perfil-pwd1"
              name="password"
              type={show1 ? "text" : "password"}
              placeholder="Mínimo 8 caracteres"
              style={{ width: "100%", paddingRight: "2.5rem" }}
              onChange={(e) => setPwd1(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShow1((v) => !v)}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--c-mid)",
                fontSize: 14,
              }}
            >
              {show1 ? "🙈" : "👁"}
            </button>
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="perfil-pwd2">
            Confirmar contraseña
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="perfil-pwd2"
              name="password2"
              type={show2 ? "text" : "password"}
              placeholder="Repite la contraseña"
              style={{ width: "100%", paddingRight: "2.5rem" }}
            />
            <button
              type="button"
              onClick={() => setShow2((v) => !v)}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--c-mid)",
                fontSize: 14,
              }}
            >
              {show2 ? "🙈" : "👁"}
            </button>
          </div>
        </div>
        <div>
          <div
            style={{
              height: 4,
              borderRadius: 2,
              background: pwd1 ? strength.color : "var(--c-line)",
              width: pwd1 ? strength.pct : "0%",
              marginTop: -4,
              transition: "background .2s, width .3s",
            }}
          />
          <div style={{ fontSize: 11, color: strength.color, marginTop: 4 }}>{pwd1 ? strength.text : ""}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" disabled={pending} className="btn btn-amber">
            {pending ? "Actualizando..." : "Actualizar contraseña"}
          </button>
        </div>
      </form>
    </div>
  );
}
