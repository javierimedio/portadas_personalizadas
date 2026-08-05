"use client";

import { useActionState, useEffect, useState } from "react";
import { useToast } from "@/shared/ui/toast";
import { ALL_CATALOGOS } from "@/shared/domain/catalogos";
import { IDIOMAS_CON_INSTRUCCIONES_PROPIAS } from "@/shared/domain/idiomas";
import { saveCampana, type SaveCampanaState } from "../application/save-campana.action";
import type { CampanaListItem } from "../domain/types";
import { CampanaFileDropZone } from "./campana-file-drop-zone";

// Réplica de #modal-campana (index.html ~1299-1394): a diferencia del resto
// de la app (que usa las etiquetas en mayúsculas de ALL_CATALOGOS), este
// modal en concreto escribe los nombres de catálogo literalmente en
// mayúscula/minúscula normal ("Roly", "Roly WRK", "Stamina", "XMAS").
const CAT_LABEL_MODAL: Record<string, string> = { roly: "Roly", roly_wrk: "Roly WRK", stamina: "Stamina", xmas: "XMAS" };

// Réplica funcional de #modal-campana (index.html ~1274-1423), con el
// cambio funcional solicitado: el PDF de "Instrucciones" pasa de ser uno
// por catálogo a uno por catálogo Y por idioma — pero solo para los 7
// idiomas de `IDIOMAS_CON_INSTRUCCIONES_PROPIAS` (2026-08-04, a petición
// del propietario del proyecto): cualquier otro idioma de los 24 de
// `IDIOMAS` usa automáticamente el PDF de Inglés al consultarse
// (`resolverInstruccionesUrl()`), así que no tiene sentido poder subir un
// PDF para él aquí — evita duplicar archivos que nunca se mostrarían.
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
  const [subiendoMap, setSubiendoMap] = useState<Record<string, boolean>>({});
  const algoSubiendo = Object.values(subiendoMap).some(Boolean);
  function trackUploading(key: string) {
    return (subiendo: boolean) => setSubiendoMap((prev) => ({ ...prev, [key]: subiendo }));
  }

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
              {CAT_LABEL_MODAL[cat.key] ?? cat.label}
            </label>
          ))}
        </div>
      </div>
      <div className="form-group">
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
        Por cada catálogo incluido, sube el PDF de opciones de portada y, para cada uno de estos 7 idiomas, el PDF de
        instrucciones correspondiente. El resto de idiomas de la solicitud usa automáticamente el PDF de Inglés — no
        hace falta ni es posible subir un PDF para ellos.
      </div>

      {ALL_CATALOGOS.filter((cat) => catalogosSelected.includes(cat.key)).map((cat) => {
        const existingCover = campana?.covers?.[cat.key];
        const existingInstr = campana?.covers_instrucciones?.[cat.key] ?? {};
        return (
          <div className={`cat-section cat-${cat.key}`} key={cat.key} style={{ marginBottom: "1rem" }}>
            <div className="cat-header">
              <h3>{CAT_LABEL_MODAL[cat.key] ?? cat.label}</h3>
            </div>
            <div className="cat-body">
              <div className="form-group" style={{ marginBottom: ".75rem" }}>
                <label className="field-label-sm">Portadas disponibles</label>
                <CampanaFileDropZone
                  name={`cover_${cat.key}`}
                  accept=".pdf"
                  existingUrl={existingCover}
                  carpeta={`campanas/${cat.key}/covers`}
                  icon="📄"
                  onUploadingChange={trackUploading(`cover_${cat.key}`)}
                />
              </div>

              <div className="form-group">
                <label className="field-label-sm">Instrucciones por idioma</label>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => setExpandido((prev) => ({ ...prev, [cat.key]: !prev[cat.key] }))}
                >
                  {expandido[cat.key] ? "▲ Ocultar" : "▼ Gestionar"} instrucciones (7 idiomas)
                </button>
                {expandido[cat.key] && (
                  <div
                    style={{
                      marginTop: 8,
                      maxHeight: 300,
                      overflowY: "auto",
                      border: "1px solid var(--c-line)",
                      borderRadius: "var(--radius)",
                      padding: ".5rem .75rem",
                    }}
                  >
                    {IDIOMAS_CON_INSTRUCCIONES_PROPIAS.map((idioma) => {
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
                          <div style={{ width: 220 }}>
                            <CampanaFileDropZone
                              name={`instr_${cat.key}_${idioma}`}
                              accept=".pdf"
                              existingUrl={url}
                              carpeta={`campanas/${cat.key}/instrucciones`}
                              icon="📋"
                              onUploadingChange={trackUploading(`instr_${cat.key}_${idioma}`)}
                            />
                          </div>
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
        <button type="submit" disabled={pending || algoSubiendo} className="btn btn-amber">
          {campana ? "Guardar cambios" : "Crear campaña"}
        </button>
        {algoSubiendo && <span style={{ fontSize: 12, color: "var(--c-mid)" }}>⏳ Subiendo archivos...</span>}
      </div>
    </form>
  );
}
