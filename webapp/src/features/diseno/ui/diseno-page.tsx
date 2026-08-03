"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DisenoTable } from "./diseno-table";
import { SolicitudDetalleModal } from "@/features/solicitudes/ui/solicitud-detalle-modal";
import type { SolicitudListItem } from "@/features/solicitudes/domain/table";
import type { FormCampana, FormPerfil } from "@/features/solicitudes/domain/types";

// Réplica de #page-diseno con su modal de detalle compartido (index.html
// ~696-720): la ficha que abre "Ver" es la misma que en Mis solicitudes.
export function DisenoPage({
  rows,
  campanas,
  perfiles,
  defaultCampanaId,
  rol,
  currentUserId,
}: {
  rows: SolicitudListItem[];
  campanas: FormCampana[];
  perfiles: FormPerfil[];
  defaultCampanaId: string;
  rol: string | null | undefined;
  currentUserId: string | null | undefined;
}) {
  const [solicitudId, setSolicitudId] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div>
      <DisenoTable
        rows={rows}
        campanas={campanas}
        perfiles={perfiles}
        defaultCampanaId={defaultCampanaId}
        rol={rol}
        currentUserId={currentUserId}
        onVer={(s) => setSolicitudId(s.id)}
      />
      {solicitudId && (
        <SolicitudDetalleModal
          solicitudId={solicitudId}
          rol={rol}
          perfiles={perfiles}
          onClose={() => setSolicitudId(null)}
          onChanged={() => router.refresh()}
          // "Editar" solo aparece en estado borrador (puedeEditar); una
          // solicitud en la cola de Diseño nunca está en ese estado, así
          // que este callback es inalcanzable desde aquí.
          onEditar={() => {}}
        />
      )}
    </div>
  );
}
