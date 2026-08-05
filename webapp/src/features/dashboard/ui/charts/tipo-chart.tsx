"use client";

import type { ChartConfiguration } from "chart.js/auto";
import { useChart } from "./use-chart";

// Réplica del CHART 5 (~4416-4440): digital vs impreso por catálogo.
export function TipoChart({
  labels,
  digital,
  impreso,
}: {
  labels: string[];
  digital: number[];
  impreso: number[];
}) {
  const config: ChartConfiguration<"bar"> = {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Digital", data: digital, backgroundColor: "#534AB7", borderRadius: 4 },
        { label: "Impreso", data: impreso, backgroundColor: "#BA7517", borderRadius: 4 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { boxWidth: 10 } } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: "#F1EFE8" } },
      },
    },
  };
  const ref = useChart(config);
  return <canvas ref={ref} />;
}
