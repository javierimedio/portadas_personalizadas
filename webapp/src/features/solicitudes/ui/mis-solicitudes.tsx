"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { campanaCerrada } from "@/shared/domain/campanas";
import { useToast } from "@/shared/ui/toast";
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
  const searchParams = useSearchParams();
  const verId = searchParams.get("ver");
  const [modal, setModal] = useState<ModalState>(verId ? { mode: "detalle", solicitudId: verId } : null);
  const router = useRouter();
  const { toast } = useToast();

  function handleSaved() {
    setModal(null);
    router.refresh();
  }

  function cerrarDetalle() {
    setModal(null);
    if (verId) router.replace("/solicitudes");
  }

  // Réplica de checkCampanaAndOpen() (~2662-2673, SOL-09): aviso temprano
  // antes de abrir el formulario — el guardado (SOL-10) sigue siendo quien
  // realmente lo impide.
  function handleNueva() {
    const campana = campanas.find((c) => c.id === defaultCampanaId);
    if (campana && campanaCerrada(campana.fecha_cierre)) {
      toast(`La campaña ${campana.nombre} está cerrada. Crea una nueva campaña.`);
      router.push("/campanas");
      return;
    }
    setModal({ mode: "new" });
  }

  return (
    <div>
      <SolicitudesTable
        rows={rows}
        campanas={campanas}
        perfiles={perfiles}
        defaultCampanaId={defaultCampanaId}
        rol={rol}
        onNueva={handleNueva}
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
          onClose={cerrarDetalle}
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
