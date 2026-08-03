"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SolicitudesTable } from "./solicitudes-table";
import { SolicitudModal } from "./solicitud-modal";
import { SolicitudDetalleModal } from "./solicitud-detalle-modal";
import type { SolicitudListItem } from "../domain/table";
import type { FormCampana, FormPerfil } from "../domain/types";

type ModalState =
  | { mode: "new" }
  | { mode: "edit"; solicitud: SolicitudListItem }
  | { mode: "detalle"; solicitudId: string }
  | null;

// Réplica de #page-mis-solicitudes con su modal (index.html ~578-1196):
// une la tabla, el formulario modal y el modal de detalle en la misma
// página, tal como hace el original (sin rutas propias).
export function MisSolicitudes({
  rows,
  campanas,
  perfiles,
  defaultCampanaId,
  rol,
}: {
  rows: SolicitudListItem[];
  campanas: FormCampana[];
  perfiles: FormPerfil[];
  defaultCampanaId: string;
  rol: string | null | undefined;
}) {
  const [modal, setModal] = useState<ModalState>(null);
  const router = useRouter();

  function handleSaved() {
    setModal(null);
    router.refresh();
  }

  return (
    <div>
      <SolicitudesTable
        rows={rows}
        campanas={campanas}
        defaultCampanaId={defaultCampanaId}
        rol={rol}
        onNueva={() => setModal({ mode: "new" })}
        onEditar={(solicitud) => setModal({ mode: "edit", solicitud })}
        onVer={(solicitud) => setModal({ mode: "detalle", solicitudId: solicitud.id })}
      />
      {modal && modal.mode !== "detalle" && (
        <SolicitudModal
          campanas={campanas}
          perfiles={perfiles}
          defaultCampanaId={defaultCampanaId}
          rol={rol}
          solicitud={modal.mode === "edit" ? modal.solicitud : null}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
      {modal && modal.mode === "detalle" && (
        <SolicitudDetalleModal
          solicitudId={modal.solicitudId}
          rol={rol}
          perfiles={perfiles}
          onClose={() => setModal(null)}
          onChanged={() => router.refresh()}
          onEditar={() => {
            const solicitud = rows.find((r) => r.id === modal.solicitudId);
            if (solicitud) setModal({ mode: "edit", solicitud });
          }}
        />
      )}
    </div>
  );
}
