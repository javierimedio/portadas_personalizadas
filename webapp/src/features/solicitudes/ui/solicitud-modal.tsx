"use client";

import { SolicitudForm } from "./solicitud-form";
import type { ExistingSolicitud, FormCampana, FormPerfil } from "../domain/types";

// Réplica de #modal-solicitud (index.html ~1017-1196): overlay real, no una
// ruta propia — mismo comportamiento que la herramienta actual (decisión
// explícita: paridad de UX, no solo funcional).
export function SolicitudModal({
  campanas,
  perfiles,
  defaultCampanaId,
  rol,
  solicitud,
  onClose,
  onSaved,
}: {
  campanas: FormCampana[];
  perfiles: FormPerfil[];
  defaultCampanaId: string;
  rol: string | null | undefined;
  solicitud: ExistingSolicitud | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <div className="modal-bg open">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{solicitud ? "Editar solicitud" : "Nueva solicitud"}</div>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <SolicitudForm
            campanas={campanas}
            perfiles={perfiles}
            defaultCampanaId={defaultCampanaId}
            rol={rol}
            solicitud={solicitud}
            onCancel={onClose}
            onSaved={onSaved}
          />
        </div>
      </div>
    </div>
  );
}
