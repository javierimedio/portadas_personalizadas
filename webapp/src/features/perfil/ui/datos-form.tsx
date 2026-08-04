"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/shared/ui/toast";
import { updateDatos, type UpdateDatosState } from "../application/update-datos.action";

// Réplica de la card "Datos personales" (index.html ~901-919) y
// savePerfilDatos() (~5808-5843): mismas validaciones, mismo aviso de
// confirmación de email, mismo toast + alerta simultáneos en éxito
// (PERF-03/04/05/06/12).
export function DatosForm({ nombre, email }: { nombre: string; email: string }) {
  const [state, formAction, pending] = useActionState<UpdateDatosState, FormData>(updateDatos, null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!state?.success) return;
    toast("Perfil actualizado.");
    router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="card" style={{ marginBottom: "1rem" }}>
      <div className="card-title">Datos personales</div>
      {state?.error && (
        <div className="alert alert-error" style={{ marginBottom: ".75rem" }}>
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className={`alert alert-${state.successKind === "info" ? "info" : "success"}`} style={{ marginBottom: ".75rem" }}>
          {state.success}
        </div>
      )}
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
        <div>
          <label className="field-label" htmlFor="perfil-nombre">
            Nombre completo
          </label>
          <input id="perfil-nombre" name="nombre" type="text" defaultValue={nombre} placeholder="Tu nombre" style={{ width: "100%" }} />
        </div>
        <div>
          <label className="field-label" htmlFor="perfil-email">
            Email
          </label>
          <input id="perfil-email" name="email" type="email" defaultValue={email} placeholder="tu@email.com" style={{ width: "100%" }} />
          <div style={{ fontSize: 11, color: "var(--c-mid)", marginTop: 4 }}>
            ⚠️ Cambiar el email requiere confirmación en el nuevo correo.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" disabled={pending} className="btn btn-amber">
            {pending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
