"use client";

import { useActionState, useEffect, useState } from "react";
import { useToast } from "@/shared/ui/toast";
import { ALL_CATALOGOS } from "@/shared/domain/catalogos";
import { IDIOMAS } from "@/shared/domain/idiomas";
import { saveCampana, type SaveCampanaState } from "../application/save-campana.action";
import type { CampanaListItem } from "../domain/types";

// Réplica de #modal-campana (index.html ~1274-1423) — con el cambio
// funcional solicitado: "Instrucciones" pasa de un PDF por catálogo a un
// PDF por catálogo Y por idioma (sección expandible por catálogo).
export function CampanaForm({
  campana,
  onCancel,
  onSaved,
}: {
  campana: CampanaListItem | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState<SaveCampanaState, FormData>(saveCampana, null);
  const { toast, formAlert } = useToast();

  const [activa, setActiva] = useState(campana?.activa ?? true);
  const [catalogosSelected, setCatalogosSelected] = useState<string[]>(
    campana?.catalogos ?? ["roly", "roly_wrk", "stamina"]
  );
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (state?.error) formAlert(state.error);
    if (state?.success) {
      toast(state.success);
      onSaved();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function toggleCatalogo(key: string) {
    setCatalogosSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  return (
    <form action={formAction}>
      {campana && <input type="hidden" name="editId" value={campana.id} />}

      <div className="form-group" style={{ marginBottom: ".75rem" }}>
        <label>
          Nombre <span className="req">*</span>
        </label>
        <input type="text" name="nombre" defaultValue={campana?.nombre ?? ""} placeholder="ej: PORTADAS 2028" />
      </div>
      <div className="form-group" style={{ marginBottom: ".75rem" }}>
        <label>Descripción</label>
        <input type="text" name="descripcion" defaultValue={campana?.descripcion ?? ""} placeholder="ej: Portadas personalizadas catálogos 2028" />
      </div>
      <div className="form-group" style={{ marginBottom: ".75rem" }}>
        <label>Fecha de cierre</label>
        <input type="date" name="fechaCierre" defaultValue={campana?.fecha_cierre?.slice(0, 10) ?? ""} />
      </div>
      <div className="form-group">
        <label>
          Catálogos incluidos <span className="req">*</span>
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
          {ALL_CATALOGOS.map((cat) => (
            <label key={cat.key} style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400, cursor: "pointer" }}>
              <input
                type="checkbox"
                name="catalogos"
                value={cat.key}
                checked={catalogosSelected.includes(cat.key)}
                onChange={() => toggleCatalogo(cat.key)}
              />
              {cat.label}
            </label>
          ))}
        </div>
      </div>
      <div className="form-group" style={{ marginTop: ".75rem" }}>
        <label>Estado</label>
        <div className="radio-group" style={{ marginTop: 6 }}>
          <label>
            <input type="radio" name="activa" value="si" checked={activa} onChange={() => setActiva(true)} /> Activa
          </label>
          <label>
            <input type="radio" name="activa" value="no" checked={!activa} onChange={() => setActiva(false)} /> Inactiva
          </label>
        </div>
      </div>

      <hr className="divider" />
      <div className="card-title" style={{ fontSize: 12 }}>
        PDFs de portadas e instrucciones <span className="req">*</span>
      </div>
      <div style={{ fontSize: 11, color: "var(--c-mid)", marginBottom: ".75rem" }}>
        Por cada catálogo incluido, sube el PDF de opciones de portada y, para cada idioma que aplique, el PDF de
        instrucciones correspondiente. Los comerciales verán el botón &quot;Ver instrucciones&quot; solo si existe un
        PDF para el idioma que hayan elegido.
      </div>

      {ALL_CATALOGOS.filter((cat) => catalogosSelected.includes(cat.key)).map((cat) => {
        const existingCover = campana?.covers?.[cat.key];
        const existingInstr = campana?.covers_instrucciones?.[cat.key] ?? {};
        const numInstr = Object.keys(existingInstr).length;
        return (
          <div className={`cat-section cat-${cat.key}`} key={cat.key} style={{ marginBottom: "1rem" }}>
            <div className="cat-header">
              <h3>{cat.label}</h3>
            </div>
            <div className="cat-body">
              <div className="form-group" style={{ marginBottom: ".75rem" }}>
                <label className="field-label-sm">Portadas disponibles</label>
                <input type="file" name={`cover_${cat.key}`} accept=".pdf" />
                {existingCover && (
                  <div style={{ fontSize: 11, marginTop: 4 }}>
                    ✅ PDF cargado ·{" "}
                    <a href={existingCover} target="_blank" rel="noreferrer" style={{ color: "var(--c-blue)" }}>
                      Ver
                    </a>{" "}
                    · <span style={{ color: "var(--c-mid)" }}>sube otro para reemplazar</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="field-label-sm">Instrucciones por idioma</label>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => setExpandido((prev) => ({ ...prev, [cat.key]: !prev[cat.key] }))}
                >
                  {expandido[cat.key] ? "▲ Ocultar" : "▼ Gestionar"} instrucciones ({numInstr}/{IDIOMAS.length} idiomas
                  cargados)
                </button>
                {expandido[cat.key] && (
                  <div
                    style={{
                      marginTop: 8,
                      maxHeight: 260,
                      overflowY: "auto",
                      border: "1px solid var(--c-line)",
                      borderRadius: "var(--radius)",
                      padding: ".5rem .75rem",
                    }}
                  >
                    {IDIOMAS.map((idioma) => {
                      const url = existingInstr[idioma];
                      return (
                        <div
                          key={idioma}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "4px 0",
                            borderBottom: "1px solid var(--c-line)",
                            fontSize: 12,
                          }}
                        >
                          <span style={{ flex: 1 }}>{idioma}</span>
                          {url && (
                            <a href={url} target="_blank" rel="noreferrer" style={{ color: "var(--c-blue)", fontSize: 11 }}>
                              Ver actual
                            </a>
                          )}
                          <input type="file" name={`instr_${cat.key}_${idioma}`} accept=".pdf" style={{ fontSize: 11, maxWidth: 200 }} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <div className="btn-row">
        <button type="button" onClick={onCancel} className="btn btn-outline">
          Cancelar
        </button>
        <button type="submit" disabled={pending} className="btn btn-amber">
          {campana ? "Guardar cambios" : "Crear campaña"}
        </button>
      </div>
    </form>
  );
}
