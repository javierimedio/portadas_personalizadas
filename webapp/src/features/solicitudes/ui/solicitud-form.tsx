"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/shared/ui/toast";
import { catalogosDeCampana, type CatalogoDef } from "@/shared/domain/catalogos";
import { IDIOMAS, PROVINCIAS, ROLES_POR_CANAL } from "../domain/constants";
import { saveSolicitud, type SaveSolicitudState } from "../application/save-solicitud.action";
import type { ExistingSolicitud, FormCampana, FormPerfil } from "../application/get-solicitud-form-data";

type CatFieldState = { digital: "" | "si" | "no"; impreso: "" | "si" | "no"; unidades: string };

function buildInitialCatState(cats: CatalogoDef[]): Record<string, CatFieldState> {
  return Object.fromEntries(cats.map((c) => [c.key, { digital: "", impreso: "", unidades: "" }]));
}

// Réplica de "ESPAÑOL" (mayúsculas, tal como se guarda, ~2931) → "Español"
// (como aparece en el <select>, ~2740).
function capitalizeIdioma(stored: string): string {
  return stored.charAt(0).toUpperCase() + stored.slice(1).toLowerCase();
}

// Réplica del modal "Nueva/Editar solicitud" (index.html ~1017-1196,
// openFormModal() ~2675-2808, saveSolicitud() ~2816-3057) — sin adjuntos ni
// las secciones ricas de catálogos (portada personalizada, diseño propio,
// posición de logo): alcance acordado para Fase 2 · Bloque 1.
export function SolicitudForm({
  campanas,
  perfiles,
  defaultCampanaId,
  rol,
  solicitud,
}: {
  campanas: FormCampana[];
  perfiles: FormPerfil[];
  defaultCampanaId: string;
  rol: string | null | undefined;
  solicitud: ExistingSolicitud | null;
}) {
  const [state, formAction, pending] = useActionState<SaveSolicitudState, FormData>(saveSolicitud, null);
  const { toast, formAlert } = useToast();
  const router = useRouter();

  const esGestor = rol === "admin" || rol === "marketing";

  const [idioma, setIdioma] = useState(solicitud?.idioma ? capitalizeIdioma(solicitud.idioma) : "");
  const [campanaId, setCampanaId] = useState(solicitud?.campana_id ?? defaultCampanaId);
  const [canal, setCanal] = useState(solicitud?.canal ?? "");
  const [comercialAsignado, setComercialAsignado] = useState(solicitud?.comercial_id ?? "");

  const campanaOptions = useMemo(
    () => campanas.filter((c) => c.activa || c.id === solicitud?.campana_id),
    [campanas, solicitud]
  );
  const selectedCampana = campanas.find((c) => c.id === campanaId) ?? null;
  const cats = useMemo(() => catalogosDeCampana(selectedCampana?.catalogos ?? null), [selectedCampana]);

  const [catState, setCatState] = useState<Record<string, CatFieldState>>(() => {
    const initial = buildInitialCatState(cats);
    for (const row of solicitud?.solicitud_catalogos ?? []) {
      if (!initial[row.catalogo]) continue;
      initial[row.catalogo] = {
        digital: row.catalogo_digital === true ? "si" : row.catalogo_digital === false ? "no" : "",
        impreso: row.catalogo_impreso === true ? "si" : row.catalogo_impreso === false ? "no" : "",
        unidades: row.unidades != null ? String(row.unidades) : "",
      };
    }
    return initial;
  });
  const prevCampanaId = useRef(campanaId);
  useEffect(() => {
    if (prevCampanaId.current === campanaId) return;
    prevCampanaId.current = campanaId;
    setCatState(buildInitialCatState(cats));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campanaId]);

  const comercialesDelCanal = useMemo(() => {
    if (!canal) return [];
    const roles = ROLES_POR_CANAL[canal as "nacional" | "exportacion"];
    return perfiles.filter((p) => p.activo && roles.includes(p.rol ?? "")).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [perfiles, canal]);

  useEffect(() => {
    if (state?.error) formAlert(state.error);
    if (state?.success) {
      toast(state.success);
      router.push("/solicitudes");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function setCatField<K extends keyof CatFieldState>(key: string, field: K, value: CatFieldState[K]) {
    setCatState((prev) => {
      const current: CatFieldState = prev[key] ?? { digital: "", impreso: "", unidades: "" };
      return { ...prev, [key]: { ...current, [field]: value } };
    });
  }

  return (
    <form action={formAction}>
      {solicitud && <input type="hidden" name="solicitudId" value={solicitud.id} />}

      <div className="card-title">Datos del cliente</div>
      <div className="form-grid" style={{ marginBottom: "1rem" }}>
        <div className="form-group">
          <label>
            Código SAP <span className="req">*</span>
          </label>
          <input type="text" name="codSap" defaultValue={solicitud?.cod_sap ?? ""} placeholder="ej: 60239" />
        </div>
        <div className="form-group">
          <label>Nombre empresa</label>
          <input type="text" name="nombreEmpresa" defaultValue={solicitud?.nombre_empresa ?? ""} placeholder="Nombre de la empresa" />
        </div>
        <div className="form-group">
          <label>
            Idioma <span className="req">*</span>
          </label>
          <select name="idioma" value={idioma} onChange={(e) => setIdioma(e.target.value)}>
            <option value="">— selecciona idioma —</option>
            {IDIOMAS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>
            Provincia / País {idioma === "Español" && <span className="req">*</span>}
          </label>
          {idioma === "Español" ? (
            <select name="provinciaSelect" defaultValue={solicitud?.provincia ?? ""}>
              <option value="">— selecciona provincia —</option>
              {PROVINCIAS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          ) : (
            <input type="text" name="provinciaInput" defaultValue={solicitud?.provincia ?? ""} placeholder="Ciudad / Región" />
          )}
        </div>
        <div className="form-group">
          <label>
            Campaña <span className="req">*</span>
          </label>
          <select name="campanaId" value={campanaId} onChange={(e) => setCampanaId(e.target.value)}>
            <option value="">— selecciona —</option>
            {campanaOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
                {!c.activa ? " (cerrada)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {esGestor && (
        <div className="form-grid" style={{ marginBottom: "1rem" }}>
          <div className="form-group">
            <label>Canal</label>
            <select name="canal" value={canal} onChange={(e) => setCanal(e.target.value)}>
              <option value="">— selecciona canal —</option>
              <option value="nacional">Nacional</option>
              <option value="exportacion">Exportación</option>
            </select>
          </div>
          <div className="form-group">
            <label>Asignar a comercial</label>
            <select name="comercialAsignado" value={comercialAsignado} onChange={(e) => setComercialAsignado(e.target.value)}>
              <option value="">— selecciona comercial —</option>
              {comercialesDelCanal.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <hr className="divider" />

      <div className="card-title">Catálogos</div>
      {cats.map((cat) => {
        const c = catState[cat.key] ?? { digital: "", impreso: "", unidades: "" };
        return (
          <div className={`cat-section cat-${cat.key}`} key={cat.key}>
            <div className="cat-header">
              <h3>{cat.label}</h3>
            </div>
            <div className="cat-body">
              <div className="toggle-row">
                <span className="toggle-label">¿Digital?</span>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      name={`cat_${cat.key}_digital`}
                      value="si"
                      checked={c.digital === "si"}
                      onChange={() => setCatField(cat.key, "digital", "si")}
                    />{" "}
                    Sí
                  </label>
                  <label>
                    <input
                      type="radio"
                      name={`cat_${cat.key}_digital`}
                      value="no"
                      checked={c.digital === "no"}
                      onChange={() => setCatField(cat.key, "digital", "no")}
                    />{" "}
                    No
                  </label>
                </div>
                <span className="toggle-label">¿Impreso?</span>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      name={`cat_${cat.key}_impreso`}
                      value="si"
                      checked={c.impreso === "si"}
                      onChange={() => setCatField(cat.key, "impreso", "si")}
                    />{" "}
                    Sí
                  </label>
                  <label>
                    <input
                      type="radio"
                      name={`cat_${cat.key}_impreso`}
                      value="no"
                      checked={c.impreso === "no"}
                      onChange={() => setCatField(cat.key, "impreso", "no")}
                    />{" "}
                    No
                  </label>
                </div>
              </div>
              {c.impreso === "si" && (
                <div className="form-group" style={{ maxWidth: 200 }}>
                  <label>Unidades</label>
                  <input
                    type="number"
                    name={`cat_${cat.key}_unidades`}
                    value={c.unidades}
                    onChange={(e) => setCatField(cat.key, "unidades", e.target.value)}
                    min={0}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}

      <hr className="divider" />
      <div className="form-group">
        <label>Comentarios</label>
        <textarea name="comentarios" rows={2} defaultValue={solicitud?.comentarios ?? ""} placeholder="Instrucciones adicionales para el equipo de diseño..." />
      </div>

      <div className="btn-row">
        <button type="submit" name="intent" value="borrador" disabled={pending} className="btn btn-outline">
          Guardar borrador
        </button>
        <button type="submit" name="intent" value="enviada" disabled={pending} className="btn btn-amber">
          Enviar solicitud
        </button>
      </div>
    </form>
  );
}
