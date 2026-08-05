import type { KpiCard } from "@/features/dashboard/domain/dashboard-stats";

function StatCard({ card, minWidth }: { card: KpiCard; minWidth: number }) {
  return (
    <div className={`stat-card ${card.tone}`} style={{ flex: 1, minWidth }}>
      <div className="stat-num">{card.num}</div>
      <div className="stat-lbl">{card.label}</div>
    </div>
  );
}

// Réplica de #dash-kpis (~4241-4301): dos filas ("Estado de solicitudes" y
// "Unidades de catálogo"), con un separador vertical entre las tarjetas de
// unidades y las de precios dentro de la segunda fila.
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
    <div style={{ marginBottom: "1.5rem" }}>
      <div style={{ width: "100%" }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: ".08em",
            color: "var(--c-mid)",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Estado de solicitudes
        </div>
        <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
          {estado.map((k) => (
            <StatCard key={k.label} card={k} minWidth={100} />
          ))}
        </div>
      </div>
      <div style={{ width: "100%", marginTop: "1rem" }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: ".08em",
            color: "var(--c-mid)",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Unidades de catálogo
        </div>
        <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", alignItems: "stretch" }}>
          {unidades.map((k) => (
            <StatCard key={k.label} card={k} minWidth={140} />
          ))}
          <div style={{ width: 1, background: "var(--c-line)", margin: "0 4px" }} />
          {precios.map((k) => (
            <StatCard key={k.label} card={k} minWidth={140} />
          ))}
        </div>
      </div>
    </div>
  );
}
