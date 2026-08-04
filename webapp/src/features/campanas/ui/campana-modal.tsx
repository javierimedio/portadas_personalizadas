"use client";

import { CampanaForm } from "./campana-form";
import type { CampanaListItem } from "../domain/types";
import { useEscapeToClose } from "@/shared/ui/use-escape-to-close";

export function CampanaModal({
  campana,
  onClose,
  onSaved,
}: {
  campana: CampanaListItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  useEscapeToClose(onClose);
  return (
    <div className="modal-bg open">
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div className="modal-title">{campana ? "Editar campaña" : "Nueva campaña"}</div>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <CampanaForm campana={campana} onCancel={onClose} onSaved={onSaved} />
        </div>
      </div>
    </div>
  );
}
