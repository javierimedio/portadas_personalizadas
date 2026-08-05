"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type Variant = "neutral" | "error";
type ToastItem = { id: number; message: string; variant: Variant };
type ToastApi = { toast: (message: string) => void; formAlert: (message: string) => void };

const ToastContext = createContext<ToastApi | null>(null);

let nextId = 1;

// Réplica de showToast() y showFormAlert() (index.html ~4034-4052, UI-02):
// dos tipos de toast — neutro (fondo oscuro, 3s) y de error (rojo, 6s, con
// ⚠️). El segundo no tenía ningún llamador real hasta el bloque de
// Solicitudes (validación de errores al guardar), por eso no se construyó
// antes.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, variant: Variant, duration: number) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      toast: (message: string) => push(message, "neutral", 3000),
      formAlert: (message: string) => push(message, "error", 6000),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: "1.5rem",
          right: "1.5rem",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          alignItems: "flex-end",
        }}
      >
        {toasts.map((t) =>
          t.variant === "error" ? (
            <div
              key={t.id}
              style={{
                background: "#E30613",
                color: "white",
                padding: ".875rem 1.25rem",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                maxWidth: 360,
                lineHeight: 1.4,
                boxShadow: "0 4px 20px rgba(227,6,19,.35)",
              }}
            >
              ⚠️ {t.message}
            </div>
          ) : (
            <div
              key={t.id}
              style={{
                background: "#2c2c2a",
                color: "white",
                padding: ".75rem 1.25rem",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                boxShadow: "0 4px 16px rgba(0,0,0,.2)",
              }}
            >
              {t.message}
            </div>
          )
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}
