import { ALL_CATALOGOS, type CatalogoDef } from "@/shared/domain/catalogos";
import { ESTADO_LABEL } from "@/shared/domain/estados";
import type { SolicitudListItem } from "@/features/solicitudes/domain/table";
import type { FormPerfil } from "@/features/solicitudes/domain/types";
import { missingFields } from "./missing-fields";

// Réplica de la resolución de catálogos/campaña de exportExcel()
// (~3793-3795): los catálogos de la campaña seleccionada, o los 4 si no
// hay campaña seleccionada ("Todas las campañas").
export function exportCatalogos(catalogosCampana: string[] | null | undefined): CatalogoDef[] {
  const keys = catalogosCampana ?? ALL_CATALOGOS.map((c) => c.key);
  return ALL_CATALOGOS.filter((c) => keys.includes(c.key));
}

function boolCell(v: boolean | null): string {
  return v === true ? "SI" : v === false ? "NO" : "";
}

export type ExportRow = (string | number)[];
export type CampanaCatalogosPorId = Map<string, string[] | null>;

// Réplica de exportSols.map() (~3803-3830): una fila por solicitud, con
// columnas dinámicas según `cats` (9 columnas, 10 si el catálogo tiene
// "Diseño 100% propio" — con_precios). `missingFields` usa los catálogos de
// LA CAMPAÑA DE CADA SOLICITUD (`campanaCatalogosPorId`), no los de `cats`
// — son dos cosas distintas: `cats` decide qué columnas tiene el Excel,
// `campanaCatalogosPorId` decide qué cuenta como "incompleta" para cada
// fila, igual que el original (~1995, `getCatsForCampana(sol.campana_id)`).
export function buildExportRows(
  sols: SolicitudListItem[],
  cats: CatalogoDef[],
  perfiles: FormPerfil[],
  campanaCatalogosPorId: CampanaCatalogosPorId
): ExportRow[] {
  return sols.map((sol) => {
    const get = (key: string) => sol.solicitud_catalogos.find((c) => c.catalogo === key);
    const comercial = perfiles.find((p) => p.id === sol.comercial_id)?.nombre ?? "";
    const missing = missingFields({
      provincia: sol.provincia,
      idioma: sol.idioma,
      campana_catalogos: sol.campana_id ? campanaCatalogosPorId.get(sol.campana_id) ?? null : null,
      solicitud_catalogos: sol.solicitud_catalogos,
    });

    const catCols: (string | number)[] = cats.flatMap((cat) => {
      const c = get(cat.key);
      const base: (string | number)[] = [
        boolCell(c?.catalogo_digital ?? null),
        boolCell(c?.catalogo_impreso ?? null),
        boolCell(c?.portada_personalizada ?? null),
        c?.portada_diseno_propio ? "DISEÑO PROPIO" : c?.portada_opcion_1 || "",
        c?.portada_opcion_2 || "",
        c?.portada_opcion_3 || "",
        c?.portada_elegida || "",
        c?.posicion_logo || "",
        c?.unidades || 0,
      ];
      if (cat.hasDisenoProp) base.push(c?.con_precios === true ? "CON PRECIOS" : c?.con_precios === false ? "SIN PRECIOS" : "");
      return base;
    });

    return [
      sol.cod_sap || "",
      sol.nombre_empresa || "",
      comercial,
      sol.idioma || "",
      sol.provincia || "",
      ...catCols,
      sol.comentarios || "",
      ESTADO_LABEL[sol.estado] || sol.estado,
      missing.length ? missing.join(", ") : "✓ Completa",
    ];
  });
}

// Réplica del nombre de archivo (~4012): espacios por guion bajo.
export function exportFilename(campanaNombre: string | null | undefined, fechaIso: string): string {
  return `${(campanaNombre || "Portadas").replace(/\s/g, "_")}_${fechaIso}.xlsx`;
}

export type ResumenRow = [string, string | number];

// Réplica de la hoja "Resumen" (~3989-4004, PAN-11). Hallazgo pendiente de
// decisión (docs/09-matriz-paridad-funcional.md § PAN-11): el original
// calcula estas métricas sobre TODAS las solicitudes de la app, no sobre
// las ya filtradas por la campaña seleccionada en el panel (`exportSols`,
// que sí usa la hoja "Portadas") — se replica tal cual mientras no haya una
// decisión explícita en contra (docs/08-protocolo-validacion.md § 8.7).
export function buildResumenRows(
  todasLasSolicitudes: SolicitudListItem[],
  campanaCatalogosPorId: CampanaCatalogosPorId,
  campanaNombre: string,
  fechaIso: string
): ResumenRow[] {
  const completas = todasLasSolicitudes.filter(
    (s) =>
      missingFields({
        provincia: s.provincia,
        idioma: s.idioma,
        campana_catalogos: s.campana_id ? campanaCatalogosPorId.get(s.campana_id) ?? null : null,
        solicitud_catalogos: s.solicitud_catalogos,
      }).length === 0
  ).length;

  return [
    ["Campaña", campanaNombre],
    ["Fecha exportación", fechaIso],
    ["Total solicitudes", todasLasSolicitudes.length],
    ["Completas", completas],
    ["Incompletas", todasLasSolicitudes.length - completas],
    ["Confirmadas", todasLasSolicitudes.filter((s) => s.estado === "confirmada").length],
  ];
}
