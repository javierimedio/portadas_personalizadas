"use client";

import { useRouter } from "next/navigation";

// Réplica de buildCampanaSelector() aplicado a #dash-filter-campana
// (~785-787, ~1630-1642): solo campañas activas, la por defecto marcada
// con ★, "Todas las campañas" como primera opción.
export function CampanaSelector({
  campanas,
  selected,
}: {
  campanas: { id: string; nombre: string; esDefault: boolean }[];
  selected: string;
}) {
  const router = useRouter();

  return (
    <select
      value={selected}
      onChange={(e) => router.push(`/dashboard?campana=${e.target.value}`)}
      className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
    >
      <option value="">Todas las campañas</option>
      {campanas.map((c) => (
        <option key={c.id} value={c.id}>
          {c.nombre}
          {c.esDefault ? " ★" : ""}
        </option>
      ))}
    </select>
  );
}
