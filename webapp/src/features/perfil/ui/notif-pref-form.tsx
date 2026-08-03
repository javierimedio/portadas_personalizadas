"use client";

import { useTransition } from "react";
import { useToast } from "@/shared/ui/toast";
import { updateNotifPref } from "../application/update-notif-pref.action";

const LABELS: Record<string, string> = {
  ambas: "Email + herramienta",
  email: "Solo email",
  herramienta: "Solo herramienta",
  ninguna: "Sin notificaciones",
};

// Réplica de la card "Notificaciones" (index.html ~882-899): se guarda al
// cambiar el select, sin botón aparte (PERF-11).
export function NotifPrefForm({ value }: { value: string }) {
  const [, startTransition] = useTransition();
  const showToast = useToast();

  function handleChange(valor: string) {
    startTransition(async () => {
      await updateNotifPref(valor);
      showToast(`Preferencia actualizada: ${LABELS[valor] ?? valor}`);
    });
  }

  return (
    <div className="card" style={{ marginBottom: "1rem" }}>
      <div className="card-title">Notificaciones</div>
      <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
        <div>
          <label className="field-label">¿Cómo quieres recibir las notificaciones?</label>
          <select defaultValue={value} onChange={(e) => handleChange(e.target.value)} style={{ width: "100%" }}>
            <option value="ambas">🔔 Email + herramienta (recomendado)</option>
            <option value="email">📧 Solo email</option>
            <option value="herramienta">🖥 Solo en la herramienta</option>
            <option value="ninguna">🔕 Sin notificaciones</option>
          </select>
        </div>
        <div style={{ fontSize: 12, color: "var(--c-mid)", lineHeight: 1.5 }}>
          Las notificaciones te informan de cambios de estado en tus solicitudes, asignaciones de diseño y comentarios
          del equipo.
        </div>
      </div>
    </div>
  );
}
