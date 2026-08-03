"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastItem = { id: number; message: string };

const ToastContext = createContext<((message: string) => void) | null>(null);

let nextId = 1;

// Réplica de showToast() (index.html ~4046-4052): esquina inferior
// derecha, fondo oscuro, autodestrucción a los 3s. `showFormAlert` (el
// otro tipo de toast de UI-02, rojo y a 6s) se añade cuando algún bloque
// futuro lo necesite — no hace falta todavía para Perfil.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: "1.5rem",
          right: "1.5rem",
          zIndex: 999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {toasts.map((t) => (
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
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}
