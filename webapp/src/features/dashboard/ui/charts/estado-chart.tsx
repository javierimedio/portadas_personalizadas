"use client";

import type { ChartConfiguration } from "chart.js/auto";
import { useChart } from "./use-chart";

// Réplica del CHART 1 (~4303-4326): doughnut de 8 estados, tooltip con
// porcentaje sobre `total` (activas, excluye archivadas — igual que el
// original, aunque el propio gráfico sí incluye la porción de archivadas).
export function EstadoChart({
  labels,
  counts,
  colors,
  total,
}: {
  labels: string[];
  counts: number[];
  colors: string[];
  total: number;
}) {
  const config: ChartConfiguration<"doughnut"> = {
    type: "doughnut",
    data: { labels, datasets: [{ data: counts, backgroundColor: colors, borderWidth: 2, borderColor: "#fff" }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: {
        legend: { position: "right", labels: { font: { size: 11 }, padding: 10, boxWidth: 12 } },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              ` ${ctx.label}: ${ctx.raw} (${total ? Math.round((Number(ctx.raw) / total) * 100) : 0}%)`,
          },
        },
      },
    },
  };
  const ref = useChart(config);
  return <canvas ref={ref} />;
}
