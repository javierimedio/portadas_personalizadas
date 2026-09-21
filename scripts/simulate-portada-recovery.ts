/**
 * simulate-portada-recovery.ts
 *
 * Script de solo lectura. Identifica todos los registros con portada_elegida
 * corrupta (patrón CODIGO_roly/wrk/stm) y reconstruye, para los que pasaron
 * por auto-adjudicación, qué portada habría asignado el algoritmo original.
 *
 * USO (desde la raíz del proyecto webapp o con ts-node/tsx):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/simulate-portada-recovery.ts
 *
 * No hace ningún UPDATE. Solo SELECT + cálculo en memoria.
 */

import { createClient } from "@supabase/supabase-js";

// ── Réplica exacta de computeAdjudicaciones (domain/auto-adjudicar.ts) ──────
type AdjudicarSolicitud = {
  id: string;
  provincia: string | null;
  created_at: string;
  solicitud_catalogos: {
    catalogo: string;
    portada_personalizada: boolean | null;
    portada_diseno_propio: boolean | null;
    portada_elegida: string | null;
    portada_opcion_1: string | null;
    portada_opcion_2: string | null;
    portada_opcion_3: string | null;
  }[];
};
type Adjudicacion = { solicitudId: string; catalogo: string; portadaElegida: string };
const CATALOGOS_ADJUDICABLES = ["roly", "roly_wrk", "stamina"];

function computeAdjudicaciones(solicitudes: AdjudicarSolicitud[]): Adjudicacion[] {
  const sorted = [...solicitudes].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const usedPortadas = new Map<string, Map<string, Set<string>>>();
  const adjudicaciones: Adjudicacion[] = [];

  for (const sol of sorted) {
    const provincia = sol.provincia || "SIN_PROVINCIA";
    if (!usedPortadas.has(provincia)) usedPortadas.set(provincia, new Map());
    const porCatalogo = usedPortadas.get(provincia)!;

    for (const catKey of CATALOGOS_ADJUDICABLES) {
      const cat = sol.solicitud_catalogos.find((c) => c.catalogo === catKey);
      if (!cat || !cat.portada_personalizada || cat.portada_diseno_propio) continue;
      if (cat.portada_elegida) continue; // ya tiene portada → el algoritmo la salta

      if (!porCatalogo.has(catKey)) porCatalogo.set(catKey, new Set());
      const used = porCatalogo.get(catKey)!;

      const opciones = [cat.portada_opcion_1, cat.portada_opcion_2, cat.portada_opcion_3].filter(
        (o): o is string => Boolean(o)
      );
      const elegida = opciones.find((o) => !used.has(o));
      if (elegida) {
        used.add(elegida);
        adjudicaciones.push({ solicitudId: sol.id, catalogo: catKey, portadaElegida: elegida });
      }
    }
  }
  return adjudicaciones;
}
// ────────────────────────────────────────────────────────────────────────────

const CORRUPT_RE = /^\d+_(roly|wrk|stm|stamina|xmas)$/i;

// Mapeo sufijo del nombre de archivo → clave de catálogo en BD
function sufijoCatalogo(portadaElegida: string): string | null {
  const m = portadaElegida.match(/_([^_]+)$/);
  const sufijo = m?.[1]?.toLowerCase();
  if (!sufijo) return null;
  if (sufijo === "roly") return "roly";
  if (sufijo === "wrk") return "roly_wrk";
  if (sufijo === "stm" || sufijo === "stamina") return "stamina";
  if (sufijo === "xmas") return "xmas";
  return null;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // ── 1. Filas corruptas ────────────────────────────────────────────────────
  const { data: corruptas, error: e1 } = await supabase
    .from("solicitud_catalogos")
    .select(
      "solicitud_id, catalogo, portada_elegida, portada_opcion_1, portada_opcion_2, portada_opcion_3, portada_diseno_propio"
    )
    .filter("portada_elegida", "neq", null);

  if (e1) { console.error("Error consultando solicitud_catalogos:", e1); process.exit(1); }

  const filasCorruptas = (corruptas ?? []).filter(
    (r) => r.portada_elegida && CORRUPT_RE.test(r.portada_elegida)
  );

  if (!filasCorruptas.length) {
    console.log("No se encontraron filas corruptas. Nada que hacer.");
    return;
  }

  const solicitudIds = [...new Set(filasCorruptas.map((r) => r.solicitud_id))];
  console.log(`\nFilas corruptas encontradas: ${filasCorruptas.length} en ${solicitudIds.length} solicitudes\n`);

  // ── 2. Datos de las solicitudes afectadas ─────────────────────────────────
  const { data: solsData, error: e2 } = await supabase
    .from("solicitudes")
    .select("id, cod_sap, provincia, created_at")
    .in("id", solicitudIds);
  if (e2) { console.error("Error consultando solicitudes:", e2); process.exit(1); }
  const solsMap = new Map((solsData ?? []).map((s) => [s.id, s]));

  // ── 3. Logs: primer en_revision_marketing → en_diseno (auto-adjudicación) ─
  const { data: logsRaw, error: e3 } = await supabase
    .from("logs")
    .select("solicitud_id, created_at, detalle")
    .in("solicitud_id", solicitudIds)
    .eq("accion", "cambio_estado")
    .order("created_at", { ascending: true });
  if (e3) { console.error("Error consultando logs:", e3); process.exit(1); }

  // Para cada solicitud: primer evento en_revision_marketing → en_diseno
  const primeraAutoAdj = new Map<string, string>(); // solicitud_id → timestamp
  for (const log of logsRaw ?? []) {
    const d = log.detalle as Record<string, string>;
    if (d?.estado_anterior === "en_revision_marketing" && d?.estado_nuevo === "en_diseno") {
      if (!primeraAutoAdj.has(log.solicitud_id)) {
        primeraAutoAdj.set(log.solicitud_id, log.created_at);
      }
    }
  }

  // ── 4. Identificar lotes (runs de auto-adjudicar) ─────────────────────────
  // Agrupamos por segundo (todas las transiciones dentro del mismo segundo
  // son del mismo run — auto-adjudicar es un único await secuencial).
  const batchMap = new Map<string, string[]>(); // batchKey → [solicitud_id]
  for (const [solId, ts] of primeraAutoAdj) {
    // Clave = segundo completo (truncar a segundos)
    const batchKey = ts.slice(0, 19); // "2026-08-10T14:32:05"
    if (!batchMap.has(batchKey)) batchMap.set(batchKey, []);
    batchMap.get(batchKey)!.push(solId);
  }

  // ── 5. Para cada lote: cargar TODOS los miembros y sus catálogos ──────────
  // Los miembros del lote son TODAS las solicitudes que cambiaron estado en
  // ese mismo segundo, no solo las afectadas.
  const allBatchMemberIds = new Set<string>();

  // Buscar todas las transiciones en_revision_marketing → en_diseno en esas ventanas
  const { data: allAutoAdjLogs, error: e4 } = await supabase
    .from("logs")
    .select("solicitud_id, created_at, detalle")
    .eq("accion", "cambio_estado")
    .order("created_at", { ascending: true });
  if (e4) { console.error("Error consultando todos los logs:", e4); process.exit(1); }

  // Expand batch windows: para cada batchKey encontrado, colectar todos los
  // sol_ids que transicionaron en_revision_marketing→en_diseno en ±2 segundos
  const batchKeyTs = [...batchMap.keys()];
  const expandedBatchMap = new Map<string, Set<string>>(); // batchKey → Set<sol_id>

  for (const bk of batchKeyTs) {
    const bkDate = new Date(bk).getTime();
    if (!expandedBatchMap.has(bk)) expandedBatchMap.set(bk, new Set());
    const members = expandedBatchMap.get(bk)!;

    for (const log of allAutoAdjLogs ?? []) {
      const d = log.detalle as Record<string, string>;
      if (d?.estado_anterior !== "en_revision_marketing" || d?.estado_nuevo !== "en_diseno") continue;
      const logTs = new Date(log.created_at).getTime();
      if (Math.abs(logTs - bkDate) <= 2000) { // 2 segundos de margen
        members.add(log.solicitud_id);
        allBatchMemberIds.add(log.solicitud_id);
      }
    }
  }

  // ── 6. Cargar catálogos de todos los miembros de todos los lotes ──────────
  const batchMemberIdsArr = [...allBatchMemberIds];
  const { data: batchCats, error: e5 } = await supabase
    .from("solicitud_catalogos")
    .select(
      "solicitud_id, catalogo, portada_personalizada, portada_diseno_propio, portada_opcion_1, portada_opcion_2, portada_opcion_3"
    )
    .in("solicitud_id", batchMemberIdsArr);
  if (e5) { console.error("Error consultando catálogos del lote:", e5); process.exit(1); }

  const { data: batchSols, error: e6 } = await supabase
    .from("solicitudes")
    .select("id, provincia, created_at")
    .in("id", batchMemberIdsArr);
  if (e6) { console.error("Error consultando solicitudes del lote:", e6); process.exit(1); }

  const batchSolsMap = new Map((batchSols ?? []).map((s) => [s.id, s]));
  const batchCatsMap = new Map<string, (typeof batchCats)[number][]>();
  for (const cat of batchCats ?? []) {
    if (!batchCatsMap.has(cat.solicitud_id)) batchCatsMap.set(cat.solicitud_id, []);
    batchCatsMap.get(cat.solicitud_id)!.push(cat);
  }

  // ── 7. Simular computeAdjudicaciones por lote ─────────────────────────────
  // IMPORTANTE: en el momento del run, portada_elegida era null para todas las
  // solicitudes del lote (eso es lo que auto-adjudicar procesa). La pasamos
  // explícitamente como null para que la simulación sea fiel.
  const simulatedMap = new Map<string, Map<string, string>>(); // sol_id → catalogo → portada

  for (const [bk, members] of expandedBatchMap) {
    const loteInput: AdjudicarSolicitud[] = [];
    for (const solId of members) {
      const s = batchSolsMap.get(solId);
      if (!s) continue;
      const cats = (batchCatsMap.get(solId) ?? []).map((c) => ({
        ...c,
        portada_elegida: null as string | null, // forzamos null: así era al momento del run
      }));
      loteInput.push({ id: s.id, provincia: s.provincia, created_at: s.created_at, solicitud_catalogos: cats });
    }

    const adjudicaciones = computeAdjudicaciones(loteInput);
    for (const a of adjudicaciones) {
      if (!simulatedMap.has(a.solicitudId)) simulatedMap.set(a.solicitudId, new Map());
      simulatedMap.get(a.solicitudId)!.set(a.catalogo, a.portadaElegida);
    }
  }

  // ── 8. Construir tabla de clasificación ───────────────────────────────────
  type ResultRow = {
    cod_sap: string;
    catalogo: string;
    corrupta: string;
    opcion_1: string;
    opcion_2: string;
    opcion_3: string;
    portada_reconstruida: string;
    motivo: string;
    clasificacion: "A_auto_adjudicacion" | "B_seleccion_manual" | "C_ambiguo";
  };

  const tabla: ResultRow[] = [];

  for (const fila of filasCorruptas) {
    const sol = solsMap.get(fila.solicitud_id);
    const codSap = sol?.cod_sap ?? fila.solicitud_id;
    const catBD = sufijoCatalogo(fila.portada_elegida ?? "") ?? fila.catalogo;

    const tieneAutoAdj = primeraAutoAdj.has(fila.solicitud_id);
    const reconstruida = simulatedMap.get(fila.solicitud_id)?.get(catBD);

    let portada_reconstruida = "";
    let motivo = "";
    let clasificacion: ResultRow["clasificacion"];

    if (!tieneAutoAdj) {
      // No hay transición en_revision_marketing → en_diseno
      clasificacion = "B_seleccion_manual";
      portada_reconstruida = "—";
      motivo = "no pasó por auto-adjudicación";
    } else if (!reconstruida) {
      // Pasó por auto-adjudicación pero la simulación no asignó nada
      // (sinOpciones, o ya tenía portada_elegida en el lote de otra solicitud)
      clasificacion = "C_ambiguo";
      portada_reconstruida = "—";
      motivo = "sin opciones libres en el lote o lote no reconstituible";
    } else {
      // Reconstrucción exitosa
      const opciones = [fila.portada_opcion_1, fila.portada_opcion_2, fila.portada_opcion_3].filter(Boolean);
      const idx = opciones.indexOf(reconstruida);
      const posicion = idx === 0 ? "opción 1" : idx === 1 ? "opción 2" : idx === 2 ? "opción 3" : "fuera de opciones";

      // Verificar si había conflicto: si la opción 1 estaba usada y se asignó otra
      const conflicto = idx > 0 ? "conflicto de provincia" : "sin conflicto";

      clasificacion = "A_auto_adjudicacion";
      portada_reconstruida = reconstruida;
      motivo = idx >= 0 ? `${posicion} — ${conflicto}` : `asignada: ${reconstruida} (verificar)`;
    }

    tabla.push({
      cod_sap: codSap,
      catalogo: catBD,
      corrupta: fila.portada_elegida ?? "",
      opcion_1: fila.portada_opcion_1 ?? "",
      opcion_2: fila.portada_opcion_2 ?? "",
      opcion_3: fila.portada_opcion_3 ?? "",
      portada_reconstruida,
      motivo,
      clasificacion,
    });
  }

  tabla.sort((a, b) => a.cod_sap.localeCompare(b.cod_sap) || a.catalogo.localeCompare(b.catalogo));

  // ── 9. Imprimir resultados ─────────────────────────────────────────────────
  const grupA = tabla.filter((r) => r.clasificacion === "A_auto_adjudicacion");
  const grupB = tabla.filter((r) => r.clasificacion === "B_seleccion_manual");
  const grupC = tabla.filter((r) => r.clasificacion === "C_ambiguo");

  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log("GRUPO A — Auto-adjudicación demostrable (portada reconstruida por lote)");
  console.log("═══════════════════════════════════════════════════════════════════════");
  if (grupA.length) {
    console.log(
      ["solicitud", "catálogo", "corrupta", "opción 1", "opción 2", "opción 3", "RECONSTRUIDA", "motivo"]
        .join("\t")
    );
    for (const r of grupA) {
      console.log(
        [r.cod_sap, r.catalogo, r.corrupta, r.opcion_1, r.opcion_2, r.opcion_3, r.portada_reconstruida, r.motivo].join(
          "\t"
        )
      );
    }
  } else {
    console.log("(ninguna)");
  }

  console.log("\n═══════════════════════════════════════════════════════════════════════");
  console.log("GRUPO B — Selección manual (NO hay auto-adjudicación — requiere revisión manual)");
  console.log("═══════════════════════════════════════════════════════════════════════");
  if (grupB.length) {
    console.log(["solicitud", "catálogo", "corrupta", "opción 1", "opción 2", "opción 3"].join("\t"));
    for (const r of grupB) {
      console.log([r.cod_sap, r.catalogo, r.corrupta, r.opcion_1, r.opcion_2, r.opcion_3].join("\t"));
    }
  } else {
    console.log("(ninguna)");
  }

  console.log("\n═══════════════════════════════════════════════════════════════════════");
  console.log("GRUPO C — Ambiguos (auto-adjudicación detectada pero sin portada reconstituible)");
  console.log("═══════════════════════════════════════════════════════════════════════");
  if (grupC.length) {
    console.log(["solicitud", "catálogo", "corrupta", "opción 1", "opción 2", "opción 3", "motivo"].join("\t"));
    for (const r of grupC) {
      console.log(
        [r.cod_sap, r.catalogo, r.corrupta, r.opcion_1, r.opcion_2, r.opcion_3, r.motivo].join("\t")
      );
    }
  } else {
    console.log("(ninguna)");
  }

  console.log(`\n──────────────────────────────────────────────────`);
  console.log(`RESUMEN`);
  console.log(`  Total filas corruptas:     ${tabla.length}`);
  console.log(`  Total solicitudes:         ${solicitudIds.length}`);
  console.log(`  Grupo A (reconstruibles):  ${grupA.length}`);
  console.log(`  Grupo B (manual):          ${grupB.length}`);
  console.log(`  Grupo C (ambiguos):        ${grupC.length}`);
  console.log(`──────────────────────────────────────────────────\n`);

  // JSON completo por si hace falta importarlo
  console.log("── JSON completo (copia para el UPDATE) ──");
  console.log(JSON.stringify(tabla, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
