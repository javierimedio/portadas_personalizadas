"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/shared/ui/toast";
import { catalogosDeCampana, type CatalogoDef } from "@/shared/domain/catalogos";
import { matchOptionCaseInsensitive } from "@/shared/domain/format";
import { IDIOMAS, POSICIONES_LOGO, PROVINCIAS, ROLES_POR_CANAL } from "../domain/constants";
import { saveSolicitud, type SaveSolicitudState } from "../application/save-solicitud.action";
import type { ExistingSolicitud, FormCampana, FormPerfil } from "../domain/types";
import { FileDropZone } from "./file-drop-zone";

type Tri = "" | "si" | "no";
type CatFieldState = {
  portadaPersonalizada: Tri;
  digital: Tri;
  impreso: Tri;
  unidades: string;
  conPrecios: Tri;
  disenoPropio: Tri;
  opcion1: string;
  opcion2: string;
  opcion3: string;
  posicionLogo: string;
};

const BLANK_CAT: CatFieldState = {
  portadaPersonalizada: "",
  digital: "",
  impreso: "",
  unidades: "",
  conPrecios: "",
  disenoPropio: "",
  opcion1: "",
  opcion2: "",
  opcion3: "",
  posicionLogo: "",
};

function tri(v: boolean | null): Tri {
  return v === true ? "si" : v === false ? "no" : "";
}

function buildInitialCatState(cats: CatalogoDef[], solicitud: ExistingSolicitud | null): Record<string, CatFieldState> {
  const initial: Record<string, CatFieldState> = Object.fromEntries(cats.map((c) => [c.key, { ...BLANK_CAT }]));
  for (const row of solicitud?.solicitud_catalogos ?? []) {
    if (!initial[row.catalogo]) continue;
    initial[row.catalogo] = {
      portadaPersonalizada: tri(row.portada_personalizada),
      digital: tri(row.catalogo_digital),
      impreso: tri(row.catalogo_impreso),
      unidades: row.unidades != null ? String(row.unidades) : "",
      conPrecios: tri(row.con_precios),
      disenoPropio: tri(row.portada_diseno_propio),
      opcion1: row.portada_opcion_1 ?? "",
      opcion2: row.portada_opcion_2 ?? "",
      opcion3: row.portada_opcion_3 ?? "",
      posicionLogo: row.posicion_logo ?? "",
    };
  }
  return initial;
}

// Réplica funcional del modal "Nueva/Editar solicitud" (index.html
// ~1017-1196, buildCatSections() ~2418-2560, openFormModal() ~2675-2808,
// saveSolicitud() ~2816-3057), corrigiendo los defectos detectados en el
// original en vez de reproducirlos (docs/09-matriz-paridad-funcional.md §
// H-08 a H-11): idioma/provincia se preseleccionan correctamente al
// reeditar sin distinguir mayúsculas/minúsculas, "Diseño 100% propio" es
// independiente por catálogo (Stamina y XMAS ya no comparten estado), y
// los enlaces "Ver portadas"/"Ver instrucciones" usan la campaña
// realmente seleccionada en el formulario.
export function SolicitudForm({
  campanas,
  perfiles,
  defaultCampanaId,
  rol,
  solicitud,
  onCancel,
  onSaved,
}: {
  campanas: FormCampana[];
  perfiles: FormPerfil[];
  defaultCampanaId: string;
  rol: string | null | undefined;
  solicitud: ExistingSolicitud | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState<SaveSolicitudState, FormData>(saveSolicitud, null);
  const { toast, formAlert } = useToast();

  const esGestor = rol === "admin" || rol === "marketing";

  const [idioma, setIdioma] = useState(matchOptionCaseInsensitive(IDIOMAS, solicitud?.idioma));
  const [provincia, setProvincia] = useState(matchOptionCaseInsensitive(PROVINCIAS, solicitud?.provincia));
  const [campanaId, setCampanaId] = useState(solicitud?.campana_id ?? defaultCampanaId);
  const [canal, setCanal] = useState(solicitud?.canal ?? "");
  const [comercialAsignado, setComercialAsignado] = useState(solicitud?.comercial_id ?? "");
  const isEspanol = idioma === "Español";

  const campanaOptions = useMemo(
    () => campanas.filter((c) => c.activa || c.id === solicitud?.campana_id),
    [campanas, solicitud]
  );
  const selectedCampana = campanas.find((c) => c.id === campanaId) ?? null;
  const cats = useMemo(() => catalogosDeCampana(selectedCampana?.catalogos ?? null), [selectedCampana]);

  const [catState, setCatState] = useState<Record<string, CatFieldState>>(() => buildInitialCatState(cats, solicitud));
  // Réplica de toggleCat()/openFormModal() (~2561-2566, ~2719-2727,
  // ~2768-2786): al crear, las secciones de catálogo empiezan contraídas;
  // al editar, empiezan expandidas (el original llama a toggleCat() una
  // vez por cada catálogo que ya tiene fila guardada).
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(cats.map((c) => [c.key, !!solicitud]))
  );

  const prevCampanaId = useRef(campanaId);
  useEffect(() => {
    if (prevCampanaId.current === campanaId) return;
    prevCampanaId.current = campanaId;
    setCatState(buildInitialCatState(cats, null));
    setExpandedCats(Object.fromEntries(cats.map((c) => [c.key, false])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campanaId]);

  const existingLogoFiles = useMemo(
    () => (solicitud?.adjuntos ?? []).filter((a) => a.tipo === "logo_general"),
    [solicitud]
  );
  const [logoFiles, setLogoFiles] = useState<File[]>([]);
  const [disenoFiles, setDisenoFiles] = useState<Record<string, File[]>>({});
  // Réplica de "if (allFilesToUpload.length > 0) ..." (~2989-2992, SOL-18):
  // el indicador solo aparece cuando hay algo que subir, no en cada guardado.
  const hasFilesToUpload = logoFiles.length > 0 || Object.values(disenoFiles).some((files) => files.length > 0);

  const comercialesDelCanal = useMemo(() => {
    if (!canal) return [];
    const roles = ROLES_POR_CANAL[canal as "nacional" | "exportacion"];
    return perfiles.filter((p) => p.activo && roles.includes(p.rol ?? "")).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [perfiles, canal]);

  useEffect(() => {
    if (state?.error) formAlert(state.error);
    if (state?.success) {
      toast(state.success);
      onSaved();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function setCatField<K extends keyof CatFieldState>(key: string, field: K, value: CatFieldState[K]) {
    setCatState((prev) => {
      const current: CatFieldState = prev[key] ?? { ...BLANK_CAT };
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
          <label>Provincia / País {isEspanol && <span className="req">*</span>}</label>
          {isEspanol ? (
            <select name="provinciaSelect" value={provincia} onChange={(e) => setProvincia(e.target.value)}>
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

      <div className="card-title">Logo del cliente</div>
      <div className="form-group" style={{ marginBottom: "1rem" }}>
        <label>
          Subir logo del cliente <span className="req">*</span>
        </label>
        <FileDropZone
          name="logoGeneralFiles"
          accept=".pdf,.png,.jpg,.jpeg,.ai,.eps"
          files={logoFiles}
          onFilesChange={setLogoFiles}
          existingFiles={existingLogoFiles}
          hint="PDF o imagen · máxima calidad · 300 dpi"
        />
      </div>

      <hr className="divider" />

      <div className="card-title">Catálogos</div>
      {cats.map((cat) => {
        const c = catState[cat.key] ?? BLANK_CAT;
        const personalizada = c.portadaPersonalizada === "si";
        const ocultaPorDisenoPropio = c.disenoPropio === "si";
        const coversUrl = selectedCampana?.covers?.[cat.key];
        const instruccionesUrl = idioma ? selectedCampana?.coversInstrucciones?.[cat.key]?.[idioma] : undefined;
        const expanded = expandedCats[cat.key] ?? false;
        const existingDisenoFiles = (solicitud?.adjuntos ?? []).filter((a) => a.tipo === `${cat.key}_diseno`);

        return (
          <div className={`cat-section cat-${cat.key}`} key={cat.key}>
            <div
              className="cat-header"
              onClick={() => setExpandedCats((prev) => ({ ...prev, [cat.key]: !prev[cat.key] }))}
            >
              <h3>{cat.label}</h3>
              <span className="toggle">{expanded ? "▲ Contraer" : "▼ Expandir"}</span>
            </div>
            <div className="cat-body" style={{ display: expanded ? "block" : "none" }}>
              {(coversUrl || instruccionesUrl) && (
                <div style={{ marginBottom: ".5rem", display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {coversUrl && (
                    <a
                      href={coversUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        color: "var(--c-blue)",
                        fontWeight: 600,
                        textDecoration: "none",
                        padding: "5px 10px",
                        border: "1px solid var(--c-blue)",
                        borderRadius: 6,
                        background: "var(--c-blue-l)",
                      }}
                    >
                      📄 Ver portadas disponibles
                    </a>
                  )}
                  {instruccionesUrl && (
                    <a
                      href={instruccionesUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        color: "var(--c-amber)",
                        fontWeight: 600,
                        textDecoration: "none",
                        padding: "5px 10px",
                        border: "1px solid var(--c-amber)",
                        borderRadius: 6,
                        background: "var(--c-amber-l)",
                      }}
                    >
                      📋 Ver instrucciones
                    </a>
                  )}
                </div>
              )}

              <div className="toggle-row">
                <span className="toggle-label" style={{ fontWeight: 700 }}>
                  Portada personalizada
                </span>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      name={`cat_${cat.key}_portadaPersonalizada`}
                      value="si"
                      checked={c.portadaPersonalizada === "si"}
                      onChange={() => setCatField(cat.key, "portadaPersonalizada", "si")}
                    />{" "}
                    Sí
                  </label>
                  <label>
                    <input
                      type="radio"
                      name={`cat_${cat.key}_portadaPersonalizada`}
                      value="no"
                      checked={c.portadaPersonalizada === "no"}
                      onChange={() => setCatField(cat.key, "portadaPersonalizada", "no")}
                    />{" "}
                    No
                  </label>
                </div>
              </div>

              <div style={{ display: personalizada ? "block" : "none" }}>
                <div className="toggle-row">
                  <span className="toggle-label">Catálogo digital</span>
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
                </div>

                <div className="toggle-row">
                  <span className="toggle-label">Catálogo impreso</span>
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

                <div style={{ display: c.impreso === "si" ? "block" : "none" }}>
                  <div className="form-grid" style={{ marginBottom: ".75rem" }}>
                    <div className="form-group">
                      <label>
                        Unidades <span className="req">*</span>
                      </label>
                      <input
                        type="number"
                        name={`cat_${cat.key}_unidades`}
                        value={c.unidades}
                        onChange={(e) => setCatField(cat.key, "unidades", e.target.value)}
                        placeholder="ej: 100"
                        min={1}
                      />
                    </div>
                  </div>
                </div>

                {cat.hasDisenoProp && (
                  <div className="toggle-row" style={{ display: isEspanol ? "flex" : "none" }}>
                    <span className="toggle-label">Catálogo con precios</span>
                    <div className="radio-group">
                      <label>
                        <input
                          type="radio"
                          name={`cat_${cat.key}_conPrecios`}
                          value="si"
                          checked={c.conPrecios === "si"}
                          onChange={() => setCatField(cat.key, "conPrecios", "si")}
                        />{" "}
                        Con precios
                      </label>
                      <label>
                        <input
                          type="radio"
                          name={`cat_${cat.key}_conPrecios`}
                          value="no"
                          checked={c.conPrecios === "no"}
                          onChange={() => setCatField(cat.key, "conPrecios", "no")}
                        />{" "}
                        Sin precios
                      </label>
                    </div>
                  </div>
                )}

                {cat.hasDisenoProp && (
                  <div className="toggle-row" style={{ marginBottom: ".75rem" }}>
                    <span className="toggle-label">Diseño 100% propio</span>
                    <div className="radio-group">
                      <label>
                        <input
                          type="radio"
                          name={`cat_${cat.key}_disenoPropio`}
                          value="si"
                          checked={c.disenoPropio === "si"}
                          onChange={() => setCatField(cat.key, "disenoPropio", "si")}
                        />{" "}
                        Sí
                      </label>
                      <label>
                        <input
                          type="radio"
                          name={`cat_${cat.key}_disenoPropio`}
                          value="no"
                          checked={c.disenoPropio === "no"}
                          onChange={() => setCatField(cat.key, "disenoPropio", "no")}
                        />{" "}
                        No
                      </label>
                    </div>
                  </div>
                )}

                <div style={{ display: ocultaPorDisenoPropio ? "none" : "block" }}>
                  <p style={{ fontSize: 12, color: "var(--c-mid)", marginBottom: ".75rem" }}>
                    Indica las 3 portadas por orden de preferencia (1ª es la prioritaria):
                  </p>
                  <div className="form-grid" style={{ marginBottom: ".75rem" }}>
                    <div className="form-group">
                      <label>
                        1ª Preferencia <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        name={`cat_${cat.key}_opcion1`}
                        value={c.opcion1}
                        onChange={(e) => setCatField(cat.key, "opcion1", e.target.value)}
                        placeholder="Nº de portada"
                      />
                    </div>
                    <div className="form-group">
                      <label>2ª Preferencia</label>
                      <input
                        type="text"
                        name={`cat_${cat.key}_opcion2`}
                        value={c.opcion2}
                        onChange={(e) => setCatField(cat.key, "opcion2", e.target.value)}
                        placeholder="Nº de portada"
                      />
                    </div>
                    <div className="form-group">
                      <label>3ª Preferencia</label>
                      <input
                        type="text"
                        name={`cat_${cat.key}_opcion3`}
                        value={c.opcion3}
                        onChange={(e) => setCatField(cat.key, "opcion3", e.target.value)}
                        placeholder="Nº de portada"
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: ocultaPorDisenoPropio ? "none" : "block" }}>
                  <div className="form-group" style={{ marginBottom: ".75rem" }}>
                    <label>
                      Posición logo <span className="req">*</span>
                    </label>
                    <select
                      name={`cat_${cat.key}_posicionLogo`}
                      value={c.posicionLogo}
                      onChange={(e) => setCatField(cat.key, "posicionLogo", e.target.value)}
                      style={{ maxWidth: 200 }}
                    >
                      <option value="">— selecciona —</option>
                      {POSICIONES_LOGO.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {cat.hasDisenoProp && (
                  <div style={{ display: ocultaPorDisenoPropio ? "block" : "none" }}>
                    <div className="form-group" style={{ marginBottom: ".5rem" }}>
                      <label>Subir diseño de portada propio ({cat.label})</label>
                      <FileDropZone
                        name={`cat_${cat.key}_disenoFiles`}
                        accept=".pdf,.ai,.eps"
                        files={disenoFiles[cat.key] ?? []}
                        onFilesChange={(files) => setDisenoFiles((prev) => ({ ...prev, [cat.key]: files }))}
                        existingFiles={existingDisenoFiles}
                        hint="PDF · 300 dpi · textos trazados"
                        icon="🎨"
                      />
                    </div>
                  </div>
                )}
              </div>
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
        <button type="button" onClick={onCancel} className="btn btn-outline">
          Cancelar
        </button>
        <button type="submit" name="intent" value="borrador" disabled={pending} className="btn btn-outline">
          Guardar borrador
        </button>
        <button type="submit" name="intent" value="enviada" disabled={pending} className="btn btn-amber">
          Enviar solicitud
        </button>
        {pending && hasFilesToUpload && <span style={{ fontSize: 12, color: "var(--c-mid)" }}>⏳ Subiendo archivos...</span>}
      </div>
    </form>
  );
}
