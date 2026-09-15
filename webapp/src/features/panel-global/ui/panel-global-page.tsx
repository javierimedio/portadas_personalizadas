"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PanelGlobalTable } from "./panel-global-table";
import { SolicitudDetalleModal } from "@/features/solicitudes/ui/solicitud-detalle-modal";
import { SolicitudModal } from "@/features/solicitudes/ui/solicitud-modal";
import type { SolicitudListItem } from "@/features/solicitudes/domain/table";
import type { FormCampana, FormPerfil } from "@/features/solicitudes/domain/types";

// Réplica de #page-panel con su modal de detalle compartido — la misma
// ficha que Mis solicitudes y Diseño.
export function PanelGlobalPage({
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
  const [solicitudId, setSolicitudId] = useState<string | null>(verId);
  const [editSolicitud, setEditSolicitud] = useState<SolicitudListItem | null>(null);
  const router = useRouter();

  function cerrarDetalle() {
    setSolicitudId(null);
    if (verId) router.replace("/panel");
  }

  function handleEditar() {
    const sol = rows.find((r) => r.id === solicitudId);
    if (sol) {
      setSolicitudId(null);
      setEditSolicitud(sol);
    }
  }

  function handleSavedEdicion() {
    setEditSolicitud(null);
    router.refresh();
  }

  return (
    <div>
      <PanelGlobalTable
        rows={rows}
        campanas={campanas}
        perfiles={perfiles}
        defaultCampanaId={defaultCampanaId}
        rol={rol}
        onVer={(s) => setSolicitudId(s.id)}
        onChanged={() => router.refresh()}
      />
      {solicitudId && (
        <SolicitudDetalleModal
          solicitudId={solicitudId}
          rol={rol}
          perfiles={perfiles}
          onClose={cerrarDetalle}
          onChanged={() => router.refresh()}
          onEditar={handleEditar}
        />
      )}
      {editSolicitud && (
        <SolicitudModal
          campanas={campanas}
          perfiles={perfiles}
          defaultCampanaId={defaultCampanaId}
          rol={rol}
          solicitud={editSolicitud}
          onClose={() => setEditSolicitud(null)}
          onSaved={handleSavedEdicion}
        />
      )}
    </div>
  );
}
