// Réplica de parseCargaFilename()/matchCargaFile() (index.html ~5204-5242):
// el nombre del archivo lleva el código SAP y, opcionalmente, un sufijo de
// catálogo. El orden de los sufijos importa (CM-02) — `_ROLY_WRK` debe
// probarse antes que `_ROLY` para no capturar el sufijo equivocado.
const CAT_SUFFIXES: [string, string][] = [
  ["_ROLY_WRK", "roly_wrk"],
  ["_ROLY", "roly"],
  ["_STAMINA", "stamina"],
  ["_STM", "stamina"],
  ["_XMAS", "xmas"],
  ["_WRK", "roly_wrk"],
];

export function parseCargaFilename(filename: string): { sap: string; catKey: string | null } {
  const base = filename
    .replace(/\.[^.]+$/, "")
    .trim()
    .toUpperCase();
  for (const [suffix, catKey] of CAT_SUFFIXES) {
    if (base.endsWith(suffix)) return { sap: base.slice(0, -suffix.length), catKey };
  }
  return { sap: base, catKey: null };
}

export type CargaMasivaSolicitud = {
  id: string;
  cod_sap: string;
  nombre_empresa: string | null;
  estado: string;
  solicitud_catalogos: { catalogo: string; portada_personalizada: boolean | null }[];
};

const ESTADOS_DISENO = ["en_diseno", "modificar_diseno"];

export type CargaMatch =
  | { status: "ok"; fileName: string; sap: string; catKey: string | null; solId: string; nombreEmpresa: string | null }
  | { status: "notfound"; fileName: string; sap: string; catKey: string | null }
  | { status: "nocatalog"; fileName: string; sap: string; catKey: string; solId: string; nombreEmpresa: string | null };

// Réplica de matchCargaFile() (~5228-5242): busca entre las solicitudes en
// en_diseno/modificar_diseno por SAP, sin acotar por campaña — el original
// tampoco lo hace (el `campId` de `procesarCargaMasiva` nunca se usa en la
// búsqueda), se replica tal cual porque el código SAP es la clave de
// emparejamiento real en toda esta pantalla, no la campaña seleccionada.
export function matchCargaFile(fileName: string, solicitudes: CargaMasivaSolicitud[]): CargaMatch {
  const { sap, catKey } = parseCargaFilename(fileName);
  const sol = solicitudes.find((s) => s.cod_sap?.toUpperCase() === sap && ESTADOS_DISENO.includes(s.estado));
  if (!sol) return { status: "notfound", fileName, sap, catKey };

  if (catKey) {
    const cat = sol.solicitud_catalogos.find((c) => c.catalogo === catKey && c.portada_personalizada);
    if (!cat) return { status: "nocatalog", fileName, sap, catKey, solId: sol.id, nombreEmpresa: sol.nombre_empresa };
  }
  return { status: "ok", fileName, sap, catKey, solId: sol.id, nombreEmpresa: sol.nombre_empresa };
}
