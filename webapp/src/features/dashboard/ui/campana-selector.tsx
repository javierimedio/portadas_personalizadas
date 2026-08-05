"use client";

import { useRouter } from "next/navigation";

// Réplica de buildCampanaSelector() aplicado a #dash-filter-campana
// (~784-789, ~1630-1642): solo campañas activas, la por defecto marcada
// con ★, "Todas las campañas" como primera opción, más el botón
// "↻ Actualizar" que fuerza volver a pedir los datos al servidor.
export function CampanaSelector({
  campanas,
  selected,
}: {
  campanas: { id: string; nombre: string; esDefault: boolean }[];
  selected: string;
}) {
  const router = useRouter();

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <select
        value={selected}
        onChange={(e) => router.push(`/dashboard?campana=${e.target.value}`)}
        style={{ fontSize: 13 }}
      >
        <option value="">Todas las campañas</option>
        {campanas.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
            {c.esDefault ? " ★" : ""}
          </option>
        ))}
      </select>
      <button type="button" className="btn btn-outline btn-sm" onClick={() => router.refresh()}>
        ↻ Actualizar
      </button>
    </div>
  );
}
