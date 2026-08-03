"use client";

import type { ChartConfiguration } from "chart.js/auto";
import { useChart } from "./use-chart";

// Réplica del CHART 4 (~4381-4414): barra apilada con/sin portada.
export function PortadasChart({
  labels,
  conPortada,
  sinPortada,
  colors,
}: {
  labels: string[];
  conPortada: number[];
  sinPortada: number[];
  colors: string[];
}) {
  const config: ChartConfiguration<"bar"> = {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Con portada", data: conPortada, backgroundColor: colors, borderRadius: 4 },
        { label: "Sin portada", data: sinPortada, backgroundColor: "#E5EAF3", borderRadius: 4 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { boxWidth: 10 } } },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, grid: { color: "#F1EFE8" } },
      },
    },
  };
  const ref = useChart(config);
  return <canvas ref={ref} />;
}
