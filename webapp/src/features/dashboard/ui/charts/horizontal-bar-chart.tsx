"use client";

import type { ChartConfiguration } from "chart.js/auto";
import { useChart } from "./use-chart";

// Componente compartido por los CHART 2 (comerciales, ~4328-4355) e idiomas
// (~4442-4470): ambos son una barra horizontal simple, solo cambia el color
// y los datos — en el original están duplicados, aquí no hace falta.
export function HorizontalBarChart({
  labels,
  counts,
  color,
}: {
  labels: string[];
  counts: number[];
  color: string;
}) {
  const config: ChartConfiguration<"bar"> = {
    type: "bar",
    data: { labels, datasets: [{ label: "Solicitudes", data: counts, backgroundColor: color, borderRadius: 4 }] },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: "#F1EFE8" } },
        y: { grid: { display: false } },
      },
    },
  };
  const ref = useChart(config);
  return <canvas ref={ref} />;
}
