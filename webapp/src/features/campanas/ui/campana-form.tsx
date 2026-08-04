"use client";

import { useActionState, useEffect, useState } from "react";
import { useToast } from "@/shared/ui/toast";
import { ALL_CATALOGOS } from "@/shared/domain/catalogos";
import { IDIOMAS } from "@/shared/domain/idiomas";
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
// por catálogo a uno por catálogo Y por idioma. La lista de idiomas con
// instrucciones no está fijada en código — cada catálogo tiene su propia
// lista dinámica (se parte de los idiomas que ya tengan PDF y se pueden
// añadir otros por nombre libre); `IDIOMAS` solo se usa como sugerencia de
// autocompletado, nunca como límite.
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
  const [idiomasPorCatalogo, setIdiomasPorCatalogo] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(ALL_CATALOGOS.map((cat) => [cat.key, Object.keys(campana?.covers_instrucciones?.[cat.key] ?? {})]))
  );
  const [nuevoIdioma, setNuevoIdioma] = useState<Record<string, string>>({});
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

  function addIdioma(catKey: string) {
    const nombre = (nuevoIdioma[catKey] ?? "").trim();
    if (!nombre) return;
    setIdiomasPorCatalogo((prev) => {
      const actuales = prev[catKey] ?? [];
      if (actuales.some((i) => i.toLowerCase() === nombre.toLowerCase())) return prev;
      return { ...prev, [catKey]: [...actuales, nombre] };
    });
    setNuevoIdioma((prev) => ({ ...prev, [catKey]: "" }));
  }

  function removeIdiomaSinPdf(catKey: string, idioma: string) {
    setIdiomasPorCatalogo((prev) => ({ ...prev, [catKey]: (prev[catKey] ?? []).filter((i) => i !== idioma) }));
  }

  return (
    <form action={formAction}>
      {campana && <input type="hidden" name="editId" value={campana.id} />}
      <datalist id="idiomas-sugeridos">
        {IDIOMAS.map((i) => (
          <option key={i} value={i} />
        ))}
      </datalist>

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
        Por cada catálogo incluido, sube el PDF de opciones de portada y, para cada idioma que aplique, el PDF de
        instrucciones correspondiente. Puedes añadir cualquier idioma por nombre — no hace falta que esté en una lista
        fija. Los comerciales verán el botón &quot;Ver instrucciones&quot; solo si existe un PDF para el idioma que
        hayan elegido.
      </div>

      {ALL_CATALOGOS.filter((cat) => catalogosSelected.includes(cat.key)).map((cat) => {
        const existingCover = campana?.covers?.[cat.key];
        const existingInstr = campana?.covers_instrucciones?.[cat.key] ?? {};
        const idiomas = idiomasPorCatalogo[cat.key] ?? [];
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
                  {expandido[cat.key] ? "▲ Ocultar" : "▼ Gestionar"} instrucciones ({idiomas.length} idioma(s))
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
                    {idiomas.map((idioma) => {
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
                          {!url && (
                            <button
                              type="button"
                              className="file-chip"
                              style={{ border: "none" }}
                              onClick={() => removeIdiomaSinPdf(cat.key, idioma)}
                              title="Quitar de la lista"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })}
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <input
                        type="text"
                        list="idiomas-sugeridos"
                        value={nuevoIdioma[cat.key] ?? ""}
                        onChange={(e) => setNuevoIdioma((prev) => ({ ...prev, [cat.key]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addIdioma(cat.key);
                          }
                        }}
                        placeholder="Añadir idioma (ej: Japonés)"
                        style={{ fontSize: 12, flex: 1 }}
                      />
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => addIdioma(cat.key)}>
                        + Añadir
                      </button>
                    </div>
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
