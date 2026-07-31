// Referencia/automatización futura (p. ej. fixtures de tests end-to-end en
// CI) — NO es el flujo manual de la Fase 0. Desde el acuerdo de "Dashboard
// primero" (docs/00-resumen-ejecutivo.md § "Principio de trabajo"), los
// usuarios y la campaña de prueba se crean manualmente desde el Dashboard
// (ver webapp/README.md), no ejecutando este script en tu máquina.
//
// Si en el futuro hace falta ejecutarlo (por ejemplo, desde un runner de
// CI para regenerar fixtures automáticamente), sigue aplicando lo mismo:
// NUNCA contra producción — usa la service_role key para saltarse RLS al
// insertar los datos de partida.
//
// Uso: SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... npx tsx scripts/seed.ts

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
}
if (SUPABASE_URL.includes("paqtohmxagfebeyyurlq")) {
  throw new Error("SUPABASE_URL apunta al proyecto de PRODUCCIÓN. Este script no puede ejecutarse ahí.");
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Un usuario de prueba por cada rol real de docs/01-analisis-funcional.md § 1.3,
// incluidas las variantes legacy — la migración no las normaliza (principio
// inamovible, docs/00-resumen-ejecutivo.md).
const TEST_USERS = [
  { email: "admin@dev.test", nombre: "Admin de Prueba", rol: "admin", codigo: "T-ADMIN" },
  { email: "marketing@dev.test", nombre: "Marketing de Prueba", rol: "marketing", codigo: "T-MKT" },
  { email: "comercial.nacional@dev.test", nombre: "Comercial Nacional de Prueba", rol: "comercial_nacional", codigo: "T-COM-NAC" },
  { email: "comercial.exportacion@dev.test", nombre: "Comercial Exportación de Prueba", rol: "comercial_exportacion", codigo: "T-COM-EXP" },
  { email: "responsable.nacional@dev.test", nombre: "Responsable Nacional de Prueba", rol: "responsable_nacional", codigo: "T-RESP-NAC" },
  { email: "responsable.exportacion@dev.test", nombre: "Responsable Exportación de Prueba", rol: "responsable_exportacion", codigo: "T-RESP-EXP" },
  { email: "disenador@dev.test", nombre: "Diseñador de Prueba", rol: "disenador", codigo: "T-DIS" },
  { email: "responsable.diseno@dev.test", nombre: "Responsable de Diseño de Prueba", rol: "responsable_diseno", codigo: "T-RESP-DIS" },
] as const;

const TEST_PASSWORD = "PortadasDev2026!";

async function seedUsers() {
  const ids: Record<string, string> = {};

  for (const u of TEST_USERS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`Creando ${u.email}: ${error.message}`);

    const { error: perfilError } = await admin.from("perfiles").insert({
      id: data.user.id,
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      codigo: u.codigo,
      activo: true,
    });
    if (perfilError) throw new Error(`Insertando perfil de ${u.email}: ${perfilError.message}`);

    ids[u.rol] = data.user.id;
    console.log(`✓ ${u.rol} — ${u.email}`);
  }

  return ids;
}

async function seedCampana(creadaPor: string) {
  const { data, error } = await admin
    .from("campanas")
    .insert({
      nombre: "Campaña de prueba — Fase 0",
      descripcion: "Campaña sintética para validar el entorno de desarrollo.",
      fecha_cierre: "2099-12-31",
      activa: true,
      catalogos: ["roly", "roly_wrk", "stamina", "xmas"],
      creada_por: creadaPor,
    })
    .select()
    .single();
  if (error) throw new Error(`Creando campaña: ${error.message}`);
  console.log(`✓ Campaña de prueba creada (${data.id})`);
  return data.id as string;
}

async function main() {
  console.log(`Sembrando datos sintéticos en ${SUPABASE_URL} ...`);
  const ids = await seedUsers();
  const adminId = ids["admin"];
  if (!adminId) throw new Error("No se creó el usuario admin de prueba.");
  await seedCampana(adminId);
  console.log("\nListo. Credenciales de todos los usuarios de prueba: contraseña", TEST_PASSWORD);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
