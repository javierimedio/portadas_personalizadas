// Copia para el proyecto Supabase de DESARROLLO de la Edge Function
// `create-user` existente en producción. Se despliega copiando este código
// en el editor de Edge Functions del Dashboard de desarrollo (Dashboard →
// Edge Functions → Create a new function) — sin CLI, ver
// docs/00-resumen-ejecutivo.md § "Principio de trabajo". Usa la
// service_role key propia de este proyecto, gestionada por Supabase
// (Dashboard → Edge Functions → Secrets) — nunca en el .env de la app
// Next.js. Ver docs/03-modelo-datos.md § 2.5/USR-08 y
// docs/09-matriz-paridad-funcional.md.
//
// TODO antes de dar esto por terminado en la Fase 0: obtener el código REAL
// de la función `create-user` de producción (Dashboard de producción →
// Edge Functions → create-user → ver código) — este archivo es un
// placeholder que reproduce el comportamiento documentado (alta de usuario
// vía Auth Admin API + insert en `perfiles`), NO una copia verificada línea
// a línea del original. No desplegar sin confirmar que coincide.
//
// H-01 (2026-08-04, revisión del ZIP de consultas SQL históricas del
// propietario del proyecto): `creacion_de_tablas.sql` (la primera versión
// del esquema, ya superada) tenía un trigger `handle_new_user()` en
// `auth.users` que autoinsertaba la fila de `perfiles`. No hay evidencia de
// que siga existiendo hoy — al contrario, `untitled_query_18.sql` y
// `conceder_permisos.sql` (más recientes) muestran altas reales hechas a
// mano: usuario creado desde el Dashboard de Supabase y el `perfiles`
// insertado/corregido después con una consulta SQL manual, siempre con
// `ON CONFLICT (id) DO UPDATE` — es decir, la única alta de usuario
// "probada en producción" que hay evidencia de NO pasa por esta Edge
// Function en absoluto, y encima asume que la fila de `perfiles` puede que
// ya exista. Por eso el insert de aquí se cambia a `upsert`: si algún
// trigger en `auth.users` llegase a crear ya la fila (no confirmado, pero
// tampoco descartado sin acceso a la base de datos real), esto la corrige
// en vez de fallar por choque de clave primaria; si no existe ningún
// trigger, se comporta exactamente igual que el insert de antes.
// ⚠️ IMPORTANTE: este archivo vive en el repositorio, pero la Edge Function
// que realmente se ejecuta en Supabase es la copia pegada a mano en el
// Dashboard (Edge Functions → create-user → editor de código) — Supabase NO
// se redespliega automáticamente al hacer push a git. Cualquier cambio aquí
// (incluida la instrumentación de abajo) solo tiene efecto en producción
// DESPUÉS de copiar este archivo entero en ese editor y pulsar "Deploy".
// Si "sigue sin funcionar" tras un cambio en este repo, lo primero que hay
// que comprobar es si ese paso manual se hizo.
import { createClient } from "npm:@supabase/supabase-js@2";

// INSTRUMENTACIÓN TEMPORAL (2026-08-04) — diagnóstico en curso de "0
// creados, N errores" (docs/09-matriz-paridad-funcional.md § H-01). No
// quitar hasta confirmar el origen exacto. Estos logs aparecen en Supabase
// Dashboard → Edge Functions → create-user → Logs (NO en la consola del
// navegador ni en los logs del servidor Next.js).
Deno.serve(async (req: Request) => {
  let payload: { email?: string; password?: string; nombre?: string; rol?: string; codigo?: string };
  try {
    payload = await req.json();
  } catch (err) {
    console.error("[create-user] no se pudo parsear el body como JSON", err);
    return Response.json({ error: "Body inválido" }, { status: 400 });
  }
  const { email, password, nombre, rol, codigo } = payload;
  console.log("[create-user] invocación recibida", {
    email,
    nombre,
    rol,
    codigo,
    passwordPresente: Boolean(password),
    passwordLength: password?.length ?? 0,
  });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, rol, codigo },
  });
  console.log("[create-user] resultado de auth.admin.createUser()", {
    userId: authUser?.user?.id ?? null,
    authError: authError ? { message: authError.message, status: authError.status, name: authError.name } : null,
  });

  if (authError || !authUser.user) {
    console.error("[create-user] fallo en auth.admin.createUser() — no se llega a tocar la tabla perfiles", authError);
    return Response.json({ error: authError?.message ?? "No se pudo crear el usuario" }, { status: 400 });
  }

  const { error: perfilError } = await supabaseAdmin
    .from("perfiles")
    .upsert({ id: authUser.user.id, nombre, email, rol, codigo, activo: true }, { onConflict: "id" });
  console.log("[create-user] resultado del upsert en perfiles", {
    userId: authUser.user.id,
    perfilError: perfilError ? { message: perfilError.message, code: perfilError.code, details: perfilError.details, hint: perfilError.hint } : null,
  });

  if (perfilError) {
    console.error("[create-user] fallo al upsert en perfiles — el usuario SÍ se creó en auth.users", perfilError);
    return Response.json({ error: perfilError.message }, { status: 400 });
  }

  console.log("[create-user] éxito completo", { userId: authUser.user.id, email });
  return Response.json({ id: authUser.user.id });
});
