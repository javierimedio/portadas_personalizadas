"use client";

import type { ChartConfiguration } from "chart.js/auto";
import { useChart } from "./use-chart";

// Réplica del CHART 3 (~4357-4379).
export function UnidadesCatalogoChart({
  labels,
  counts,
  colors,
}: {
  labels: string[];
  counts: number[];
  colors: string[];
}) {
  const config: ChartConfiguration<"bar"> = {
    type: "bar",
    data: { labels, datasets: [{ data: counts, backgroundColor: colors, borderRadius: 6 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ` ${Number(ctx.raw).toLocaleString()} uds` } },
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: "#F1EFE8" } },
      },
    },
  };
  const ref = useChart(config);
  return <canvas ref={ref} />;
}
