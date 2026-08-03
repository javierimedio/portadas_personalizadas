import type { ProgresoStep } from "@/features/dashboard/domain/dashboard-stats";

// Réplica de #dash-progreso (~4502-4528): oculto si no hay pasos (total=0).
export function Progreso({ steps }: { steps: ProgresoStep[] }) {
  if (steps.length === 0) return null;

  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <div className="mb-3 text-sm font-bold">Progreso de la campaña</div>
      <div className="space-y-3">
        {steps.map((step) => (
          <div key={step.label}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-medium">{step.label}</span>
              <span className="text-neutral-500">
                {step.count} solicitudes ({step.pct}%)
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{ width: `${step.pct}%`, backgroundColor: step.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
