"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/shared/infrastructure/supabase/browser-client";
import { debeActualizar } from "@/shared/domain/realtime-debounce";

const DEBOUNCE_MS = 2000;
const POLL_MS = 30000;

// Réplica de initRealtime()/subscribeToTable()/startPolling() (index.html
// ~4618-4734, UI-12 a UI-17): en vez de reimplementar a mano el protocolo
// Phoenix sobre WebSocket, se usa el canal Realtime de supabase-js — misma
// tabla (`solicitudes`), mismo resultado observable (recarga de los datos
// de la página actual — aquí `router.refresh()`, el equivalente de
// `loadData()` en un SPA — con un aviso sutil que desaparece a los 2.5s).
// La reconexión automática (UI-13) la da la propia librería; si el canal
// nunca llega a suscribirse, cae a sondeo cada 30s (UI-14/UI-15) que SÍ
// recarga pero NO muestra el aviso — igual que el original.
//
// Requisito de infraestructura (fuera de este código, ver
// docs/03-modelo-datos.md § 3.4.4): la tabla `solicitudes` debe tener
// Realtime habilitado en el proyecto de Supabase (Database → Replication),
// si no el canal nunca pasa de "CHANNEL_ERROR"/"TIMED_OUT" y el sistema
// funciona igual, pero siempre por la vía de sondeo.
export function RealtimeSync() {
  const router = useRouter();
  const [indicador, setIndicador] = useState(false);
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    const supabase = createClient();
    let pollingInterval: ReturnType<typeof setInterval> | null = null;
    let indicadorTimeout: ReturnType<typeof setTimeout> | null = null;

    function refrescar(mostrarAviso: boolean) {
      const now = Date.now();
      if (!debeActualizar(lastUpdateRef.current, now, DEBOUNCE_MS)) return;
      lastUpdateRef.current = now;
      router.refresh();
      if (mostrarAviso) {
        setIndicador(true);
        if (indicadorTimeout) clearTimeout(indicadorTimeout);
        indicadorTimeout = setTimeout(() => setIndicador(false), 2500);
      }
    }

    function startPolling() {
      if (pollingInterval) return;
      pollingInterval = setInterval(() => refrescar(false), POLL_MS);
    }

    const channel = supabase
      .channel("portadas-solicitudes")
      .on("postgres_changes", { event: "*", schema: "public", table: "solicitudes" }, () => refrescar(true))
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") startPolling();
      });

    return () => {
      supabase.removeChannel(channel);
      if (pollingInterval) clearInterval(pollingInterval);
      if (indicadorTimeout) clearTimeout(indicadorTimeout);
    };
  }, [router]);

  if (!indicador) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 60,
        right: "1rem",
        background: "var(--c-dark)",
        color: "white",
        padding: ".4rem .9rem",
        borderRadius: 20,
        fontSize: 11,
        zIndex: 999,
        opacity: 0.85,
      }}
    >
      ↻ Datos actualizados
    </div>
  );
}
