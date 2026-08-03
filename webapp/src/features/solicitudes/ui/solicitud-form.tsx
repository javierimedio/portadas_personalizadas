"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/shared/ui/toast";
import { catalogosDeCampana, type CatalogoDef } from "@/shared/domain/catalogos";
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
      opcion1: row.portada_opcion_1 ?? "",
      opcion2: row.portada_opcion_2 ?? "",
      opcion3: row.portada_opcion_3 ?? "",
      posicionLogo: row.posicion_logo ?? "",
    };
  }
  return initial;
}

// Réplica de "ESPAÑOL" (mayúsculas, tal como se guarda, ~2931) → "Español"
// (como aparece en el <select>, ~2740).
function capitalizeIdioma(stored: string): string {
  return stored.charAt(0).toUpperCase() + stored.slice(1).toLowerCase();
}

// Réplica exacta del modal "Nueva/Editar solicitud" (index.html ~1017-1196,
// buildCatSections() ~2418-2560, openFormModal() ~2675-2808, saveSolicitud()
// ~2816-3057). Incluye dos comportamientos replicados tal cual, no
// corregidos (decisión explícita — ver conversación):
//
// 1. "Diseño 100% propio" está cableado en el original al catálogo
//    'stamina' literalmente (data-cat="stamina" fijo en la plantilla,
//    incluso al pintar la sección de XMAS) — por eso aquí es un único
//    estado `disenoPropioStamina` compartido entre las secciones de
//    Stamina y XMAS, en vez de un campo por catálogo. Para XMAS, activar
//    "Diseño propio" no oculta sus propios campos de selección/posición
//    (togglePortadaFields solo comprueba `key === 'stamina'` para eso) ni
//    revela una zona de subida propia (la única zona de subida real,
//    "Subir diseño de portada propio", solo es alcanzable para 'stamina').
// 2. Los enlaces "Ver portadas disponibles"/"Ver instrucciones" usan
//    siempre la campaña activa por defecto (`activeCampana` en el
//    original), NO la campaña seleccionada en este formulario — así que si
//    cambias de campaña en el propio formulario, los enlaces no cambian.
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

  const [idioma, setIdioma] = useState(solicitud?.idioma ? capitalizeIdioma(solicitud.idioma) : "");
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
  // Réplica del bug nº 2 de la cabecera: los enlaces de portadas/instrucciones
  // siempre miran a la campaña activa por defecto, no a `selectedCampana`.
  const campanaActiva = campanas.find((c) => c.id === defaultCampanaId) ?? null;

  const [catState, setCatState] = useState<Record<string, CatFieldState>>(() => buildInitialCatState(cats, solicitud));
  const [disenoPropioStamina, setDisenoPropioStamina] = useState<Tri>(
    tri(solicitud?.solicitud_catalogos.find((c) => c.catalogo === "stamina")?.portada_diseno_propio ?? null)
  );
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
    setDisenoPropioStamina("");
    setExpandedCats(Object.fromEntries(cats.map((c) => [c.key, false])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campanaId]);

  const existingLogoFiles = useMemo(
    () => (solicitud?.adjuntos ?? []).filter((a) => a.tipo === "logo_general"),
    [solicitud]
  );
  const existingStaminaDisenoFiles = useMemo(
    () => (solicitud?.adjuntos ?? []).filter((a) => a.tipo === "stamina_diseno"),
    [solicitud]
  );
  const [logoFiles, setLogoFiles] = useState<File[]>([]);
  const [staminaDisenoFiles, setStaminaDisenoFiles] = useState<File[]>([]);

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
      <input type="hidden" name="disenoPropioStamina" value={disenoPropioStamina} />

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
        // Bug replicado (ver cabecera del componente): el ocultamiento de
        // "selección de portadas"/"posición logo" por diseño propio solo se
        // aplica literalmente al catálogo 'stamina'.
        const ocultaPorDisenoPropio = cat.key === "stamina" && disenoPropioStamina === "si";
        const coversUrl = campanaActiva?.covers?.[cat.key];
        const instruccionesUrl = idioma ? campanaActiva?.coversInstrucciones?.[cat.key]?.[idioma] : undefined;
        const expanded = expandedCats[cat.key] ?? false;

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
                      {/* name único por sección (no "disenoPropioStamina"): con el
                          mismo name en dos grupos de radios distintos, el navegador
                          fuerza selección única entre los CUATRO inputs (los de
                          Stamina y los de XMAS), rompiendo la sincronía visual del
                          estado compartido. El valor real que se envía va por el
                          input hidden de más abajo. */}
                      <label>
                        <input
                          type="radio"
                          name={`disenoPropioStamina_${cat.key}`}
                          value="si"
                          checked={disenoPropioStamina === "si"}
                          onChange={() => setDisenoPropioStamina("si")}
                        />{" "}
                        Sí
                      </label>
                      <label>
                        <input
                          type="radio"
                          name={`disenoPropioStamina_${cat.key}`}
                          value="no"
                          checked={disenoPropioStamina === "no"}
                          onChange={() => setDisenoPropioStamina("no")}
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

                {cat.key === "stamina" && (
                  <div style={{ display: disenoPropioStamina === "si" ? "block" : "none" }}>
                    <div className="form-group" style={{ marginBottom: ".5rem" }}>
                      <label>Subir diseño de portada propio (Stamina)</label>
                      <FileDropZone
                        name="staminaDisenoFiles"
                        accept=".pdf,.ai,.eps"
                        files={staminaDisenoFiles}
                        onFilesChange={setStaminaDisenoFiles}
                        existingFiles={existingStaminaDisenoFiles}
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
      </div>
    </form>
  );
}
