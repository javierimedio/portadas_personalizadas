"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PanelGlobalTable } from "./panel-global-table";
import { SolicitudDetalleModal } from "@/features/solicitudes/ui/solicitud-detalle-modal";
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
  const router = useRouter();

  function cerrarDetalle() {
    setSolicitudId(null);
    if (verId) router.replace("/panel");
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
          onEditar={() => {}}
        />
      )}
    </div>
  );
}
