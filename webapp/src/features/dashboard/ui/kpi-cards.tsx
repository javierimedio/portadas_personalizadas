import type { KpiCard } from "@/features/dashboard/domain/dashboard-stats";

const TONE_CLASSES: Record<KpiCard["tone"], string> = {
  "": "text-neutral-900",
  amber: "text-amber-600",
  blue: "text-blue-700",
  green: "text-green-700",
};

function KpiGroup({ title, cards }: { title: string; cards: KpiCard[] }) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-neutral-500">{title}</div>
      <div className="flex flex-wrap gap-3">
        {cards.map((k) => (
          <div key={k.label} className="min-w-[110px] flex-1 rounded-lg border border-neutral-200 p-3">
            <div className={`text-xl font-bold ${TONE_CLASSES[k.tone]}`}>{k.num}</div>
            <div className="text-xs text-neutral-500">{k.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Réplica de las tarjetas #dash-kpis (~4241-4301): 8 de estado, 3 de
// unidades + 2 de precios en el mismo bloque (el original las separa con un
// divisor vertical dentro de la misma fila; aquí se agrupan igual).
export function KpiCards({
  estado,
  unidades,
  precios,
}: {
  estado: KpiCard[];
  unidades: KpiCard[];
  precios: KpiCard[];
}) {
  return (
    <div className="mb-6 space-y-4">
      <KpiGroup title="Estado de solicitudes" cards={estado} />
      <KpiGroup title="Unidades de catálogo" cards={[...unidades, ...precios]} />
    </div>
  );
}
