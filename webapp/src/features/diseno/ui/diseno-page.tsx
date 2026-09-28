"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { DisenoTable } from "./diseno-table";
import { CargaMasivaModal } from "./carga-masiva-modal";
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
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const verId = searchParams.get("ver");
  const [solicitudId, setSolicitudId] = useState<string | null>(verId);
  const [cargaMasivaAbierta, setCargaMasivaAbierta] = useState(false);
  const router = useRouter();

  // Sincroniza solicitudId con el parámetro ?ver= de la URL. Necesario porque
  // useState solo inicializa en el primer montaje: cuando router.push navega a
  // /diseno?ver=<id> estando ya en /diseno, el componente no se remonta y el
  // initializer de useState se ignora. Este efecto lo resuelve para todas las
  // transiciones (verId aparece, cambia o desaparece).
  useEffect(() => {
    setSolicitudId(verId);
  }, [verId]);

  function cerrarDetalle() {
    setSolicitudId(null);
    if (verId) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("ver");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }
  }

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
        onCargaMasiva={() => setCargaMasivaAbierta(true)}
      />
      {cargaMasivaAbierta && (
        <CargaMasivaModal
          rows={rows}
          onClose={() => setCargaMasivaAbierta(false)}
          onProcessed={() => {
            setCargaMasivaAbierta(false);
            router.refresh();
          }}
        />
      )}
      {solicitudId && (
        <SolicitudDetalleModal
          solicitudId={solicitudId}
          rol={rol}
          perfiles={perfiles}
          onClose={cerrarDetalle}
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
