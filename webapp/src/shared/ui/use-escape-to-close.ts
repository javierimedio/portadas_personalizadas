"use client";

import { useEffect } from "react";

// Réplica de handleModalEscape() (index.html ~4020-4028): cierra el modal
// abierto al pulsar Escape. El original solo cubría los modales predefinidos
// en el HTML (NAV-13/H-04) — aquí se aplica por igual a todos, predefinidos
// o construidos dinámicamente, ya que no hay ninguna razón funcional para
// que unos se comporten distinto de otros.
export function useEscapeToClose(onClose: () => void) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
}
