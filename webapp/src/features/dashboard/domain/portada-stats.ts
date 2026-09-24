// Analítica de portadas más solicitadas por catálogo.
// Fuente de verdad: solicitud_catalogos.portada_elegida (adjudicación final).
// No utiliza portada_opcion_1/2/3 ni ningún otro campo sustituto.

import { isPortadaCorrupta } from "@/shared/domain/portadas-validacion";
import type { CatDef, Solicitud } from "./dashboard-stats";

export const TOP_PORTADAS_N = 5;

// Estados excluidos: borrador (no enviado) y archivada (cancelado).
// El resto —incluido en_diseno, confirmada, etc.— sí cuentan, porque la
// auto-adjudicación ya considera solicitudes en cualquier estado posterior
// al envío.
const ESTADOS_EXCLUIDOS = new Set(["borrador", "archivada"]);

export type PortadaRankingEntry = {
  portada: string;   // valor de portada_elegida
  total: number;
  pct: number;       // 0-100, redondeado; denominador = totalValidas del catálogo
};

export type PortadaInvalidaDetalle = {
  solicitudId: string;
  codSap: string | null;
  catalogo: string;
  portadaElegida: string;
  estado: string;
};

export type CatalogoPortadaStats = {
  catalogo: string;
  label: string;
  ranking: PortadaRankingEntry[];   // ordenado desc por total
  totalValidas: number;
  disenoPropioCount: number;
  sinAdjudicarCount: number;
  invalidosCount: number;
  invalidosDetalle: PortadaInvalidaDetalle[];
};

export type PortadaStatsResult = CatalogoPortadaStats[];

export function buildPortadaStats(
  solicitudes: Solicitud[],
  cats: CatDef[]
): PortadaStatsResult {
  const elegibles = solicitudes.filter((s) => !ESTADOS_EXCLUIDOS.has(s.estado));

  return cats.map((cat) => {
    let disenoPropioCount = 0;
    let sinAdjudicarCount = 0;
    const validaMap = new Map<string, number>();
    const invalidosDetalle: PortadaInvalidaDetalle[] = [];

    for (const sol of elegibles) {
      // Cada solicitud tiene como máximo una fila por catálogo (clave única
      // (solicitud_id, catalogo) en BD). find() devuelve solo la primera.
      const catRow = sol.solicitud_catalogos.find((c) => c.catalogo === cat.key);

      // Sin fila o portada_personalizada !== true → no pidió portada → excluir
      if (!catRow || catRow.portada_personalizada !== true) continue;

      if (catRow.portada_diseno_propio === true) {
        disenoPropioCount++;
        continue;
      }

      const pe = catRow.portada_elegida ?? null;

      // null o string vacío → aún no adjudicada
      if (!pe) {
        sinAdjudicarCount++;
        continue;
      }

      if (isPortadaCorrupta(pe)) {
        invalidosDetalle.push({
          solicitudId: sol.id,
          codSap: sol.cod_sap ?? null,
          catalogo: cat.key,
          portadaElegida: pe,
          estado: sol.estado,
        });
        continue;
      }

      // Portada válida: agrupar por valor
      validaMap.set(pe, (validaMap.get(pe) ?? 0) + 1);
    }

    const ranking = [...validaMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([portada, total]) => ({ portada, total, pct: 0 }));

    const totalValidas = ranking.reduce((sum, e) => sum + e.total, 0);
    for (const entry of ranking) {
      entry.pct = totalValidas > 0 ? Math.round((entry.total / totalValidas) * 100) : 0;
    }

    return {
      catalogo: cat.key,
      label: cat.label,
      ranking,
      totalValidas,
      disenoPropioCount,
      sinAdjudicarCount,
      invalidosCount: invalidosDetalle.length,
      invalidosDetalle,
    };
  });
}
