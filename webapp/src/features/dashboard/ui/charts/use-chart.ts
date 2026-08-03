"use client";

import { useEffect, useRef } from "react";
import { Chart, type ChartConfiguration } from "chart.js/auto";

// DASH-15: destruye el gráfico anterior antes de repintar. En el original
// es un objeto global `dashCharts` con un destroyCharts() manual
// (~4184-4187); aquí ocurre igual pero en el cleanup de cada efecto, sin
// estado global.
export function useChart(config: ChartConfiguration) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const configKey = JSON.stringify(config);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current = new Chart(canvasRef.current, config);
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
    // Se compara por el JSON de los datos (labels/colores/valores), no por
    // identidad del objeto de config, que se reconstruye en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey]);

  return canvasRef;
}
