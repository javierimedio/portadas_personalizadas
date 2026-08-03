import type { ProgresoStep } from "@/features/dashboard/domain/dashboard-stats";

// Réplica de la card "Progreso de la campaña" + #dash-progreso (~849-853,
// ~4502-4528): oculto si no hay pasos (total=0).
export function Progreso({ steps }: { steps: ProgresoStep[] }) {
  if (steps.length === 0) return null;

  return (
    <div className="card">
      <div className="card-title">Progreso de la campaña</div>
      {steps.map((step) => (
        <div key={step.label} style={{ marginBottom: ".75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
            <span style={{ fontWeight: 500 }}>{step.label}</span>
            <span style={{ color: "var(--c-mid)" }}>
              {step.count} solicitudes ({step.pct}%)
            </span>
          </div>
          <div style={{ background: "var(--c-light)", borderRadius: 20, height: 8, overflow: "hidden" }}>
            <div
              style={{
                width: `${step.pct}%`,
                height: "100%",
                background: step.color,
                borderRadius: 20,
                transition: "width .4s ease",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
