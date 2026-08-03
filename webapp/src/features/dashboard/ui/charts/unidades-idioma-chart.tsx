"use client";

import type { ChartConfiguration } from "chart.js/auto";
import { useChart } from "./use-chart";

// Réplica del gráfico "Unidades por catálogo / idioma" (~4472-4500): barra
// horizontal apilada, un dataset por catálogo activo.
export function UnidadesIdiomaChart({
  idiomaLabels,
  datasets,
}: {
  idiomaLabels: string[];
  datasets: { label: string; color: string; data: number[] }[];
}) {
  const config: ChartConfiguration<"bar"> = {
    type: "bar",
    data: {
      labels: idiomaLabels,
      datasets: datasets.map((d) => ({
        label: d.label,
        data: d.data,
        backgroundColor: d.color,
        borderRadius: 3,
      })),
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: { legend: { labels: { boxWidth: 10 } } },
      scales: {
        x: { stacked: true, grid: { color: "#F1EFE8" } },
        y: { stacked: true, grid: { display: false } },
      },
    },
  };
  const ref = useChart(config);
  return <canvas ref={ref} />;
}
