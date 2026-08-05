#!/usr/bin/env node
/**
 * Limpia el bucket `portadas-adjuntos` eliminando todo su contenido
 * excepto las carpetas de primer nivel protegidas:
 *   campanas · instrucciones · modificaciones · undefined
 *
 * Uso (desde webapp/):
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/limpiar-bucket.mjs
 *
 * @supabase/supabase-js ya es dependencia de este proyecto.
 * No elimina el bucket, solo los objetos que contiene.
 * Idempotente: ejecutarlo varias veces no produce errores.
 */

import { createClient } from "@supabase/supabase-js";

// ─── Configuración ────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "ERROR: faltan variables de entorno.\n" +
    "  SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar definidas."
  );
  process.exit(1);
}

const BUCKET = "portadas-adjuntos";

/** Carpetas de primer nivel que NO se tocan. */
const PROTEGIDAS = new Set(["campanas", "instrucciones", "modificaciones", "undefined"]);

/** Máximo de paths por llamada a remove(). La Storage API de Supabase admite hasta ~1 000. */
const LOTE = 100;

// ─── Cliente ──────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Devuelve los paths de todos los archivos bajo `prefijo`, recursivamente.
 * Las carpetas virtuales de Supabase Storage aparecen con id === null;
 * no son paths eliminables pero hay que explorarlas para llegar a sus archivos.
 */
async function listarArchivos(prefijo) {
  const resultado = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefijo, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });

    if (error) throw new Error(`Error listando '${prefijo || "(raíz)"}': ${error.message}`);
    if (!data || data.length === 0) break;

    for (const item of data) {
      const path = prefijo ? `${prefijo}/${item.name}` : item.name;

      if (item.id === null) {
        // Carpeta virtual — explorar recursivamente
        const sub = await listarArchivos(path);
        resultado.push(...sub);
      } else {
        resultado.push(path);
      }
    }

    if (data.length < 1000) break;
    offset += 1000;
  }

  return resultado;
}

/**
 * Elimina un array de paths en lotes de LOTE.
 * remove() es idempotente: paths que ya no existen no producen error.
 */
async function eliminarEnLotes(paths) {
  for (let i = 0; i < paths.length; i += LOTE) {
    const lote = paths.slice(i, i + LOTE);
    const { error } = await supabase.storage.from(BUCKET).remove(lote);
    if (error) throw new Error(`Error eliminando lote [${i}..${i + lote.length}]: ${error.message}`);
    process.stdout.write(`\r  ✓ ${Math.min(i + LOTE, paths.length)}/${paths.length} archivos...`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nBucket  : ${BUCKET}`);
  console.log(`URL     : ${SUPABASE_URL}`);
  console.log(`Protegidas: ${[...PROTEGIDAS].join(", ")}\n`);

  // 1. Listar primer nivel
  const { data: raiz, error: errorRaiz } = await supabase.storage
    .from(BUCKET)
    .list("", { limit: 1000, sortBy: { column: "name", order: "asc" } });

  if (errorRaiz) throw new Error(`Error listando la raíz del bucket: ${errorRaiz.message}`);

  if (!raiz || raiz.length === 0) {
    console.log("El bucket ya está vacío. Nada que hacer.");
    return;
  }

  // 2. Recopilar paths a eliminar
  const aEliminar = [];
  const carpetasAfectadas = [];

  for (const item of raiz) {
    if (PROTEGIDAS.has(item.name)) {
      console.log(`  ⏭  Protegida — ignorando: ${item.name}/`);
      continue;
    }

    if (item.id === null) {
      // Carpeta no protegida — recopilar contenido recursivamente
      console.log(`  🔍 Explorando: ${item.name}/`);
      const archivos = await listarArchivos(item.name);
      if (archivos.length > 0) {
        aEliminar.push(...archivos);
        carpetasAfectadas.push(`${item.name}/ (${archivos.length} archivos)`);
      } else {
        console.log(`     (vacía, se ignorará)`);
      }
    } else {
      // Archivo en la raíz del bucket
      aEliminar.push(item.name);
    }
  }

  if (aEliminar.length === 0) {
    console.log("\nNada que eliminar. El bucket ya estaba limpio.");
    return;
  }

  console.log(`\nTotal a eliminar: ${aEliminar.length} archivo(s)\n`);

  // 3. Eliminar
  await eliminarEnLotes(aEliminar);

  // 4. Resumen
  console.log(`\n\n─────────────────────────────────`);
  console.log(`Archivos eliminados : ${aEliminar.length}`);
  if (carpetasAfectadas.length > 0) {
    console.log(`Carpetas vaciadas   : ${carpetasAfectadas.length}`);
    carpetasAfectadas.forEach((c) => console.log(`  · ${c}`));
  }
  console.log(`─────────────────────────────────\n`);
}

main().catch((err) => {
  console.error("\nERROR:", err.message);
  process.exit(1);
});
