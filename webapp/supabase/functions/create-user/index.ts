// Edge Function `create-user` — alta de usuario vía Auth Admin API +
// creación/actualización de su fila en `perfiles` (docs/03-modelo-datos.md
// § 2.5/USR-08, docs/09-matriz-paridad-funcional.md § H-01). Usa la
// service_role key propia del proyecto, gestionada por Supabase (Dashboard →
// Edge Functions → Secrets) — nunca en el .env de la app Next.js.
//
// ⚠️ Este archivo vive en el repositorio, pero la Edge Function que
// realmente se ejecuta en Supabase es la copia pegada a mano en el
// Dashboard (Edge Functions → create-user → editor de código) — Supabase NO
// se redespliega automáticamente al hacer push a git. Cualquier cambio aquí
// solo tiene efecto en producción DESPUÉS de copiar este archivo entero en
// ese editor y pulsar "Deploy" (ver docs/10-auditoria-despliegue-manual.md).
//
// Idempotencia (2026-08-04, cierre de H-01): un intento de importación
// previo puede haber dejado usuarios creados en `auth.users` sin su fila de
// `perfiles` (p. ej. si esta función falló entre ambos pasos, o si el
// primer intento se hizo con una versión de esta función que fallaba antes
// de llegar aquí). Reintentar la importación con esos mismos emails hacía
// que `auth.admin.createUser()` fallara con "usuario ya registrado" para
// cada uno de ellos — un motivo de error distinto al original, pero que
// producía el mismo síntoma observable ("0 creados"). Ahora, si el alta
// falla por email ya existente, se localiza el usuario ya creado y se
// continúa con el upsert de `perfiles` igualmente, en vez de abortar.
import { createClient } from "npm:@supabase/supabase-js@2";

async function buscarUsuarioPorEmail(supabaseAdmin: ReturnType<typeof createClient>, email: string) {
  const perPage = 200;
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error || !data) return null;
    const encontrado = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (encontrado) return encontrado;
    if (data.users.length < perPage) return null;
  }
  return null;
}

Deno.serve(async (req: Request) => {
  let payload: { email?: string; password?: string; nombre?: string; rol?: string; codigo?: string };
  try {
    payload = await req.json();
  } catch (err) {
    console.error("[create-user] body inválido", err);
    return Response.json({ error: "Body inválido" }, { status: 400 });
  }
  const { email, password, nombre, rol, codigo } = payload;
  if (!email || !password || !nombre) {
    return Response.json({ error: "Email, contraseña y nombre son obligatorios." }, { status: 400 });
  }

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

  let userId = authUser?.user?.id;
  if (authError || !userId) {
    const yaRegistrado = authError?.code === "email_exists" || /already.*(registered|exists)/i.test(authError?.message ?? "");
    if (!yaRegistrado) {
      console.error("[create-user] fallo en auth.admin.createUser()", { email, authError });
      return Response.json({ error: authError?.message ?? "No se pudo crear el usuario" }, { status: 400 });
    }
    const existente = await buscarUsuarioPorEmail(supabaseAdmin, email);
    if (!existente) {
      console.error("[create-user] email ya registrado pero no se localizó en auth.users", { email });
      return Response.json({ error: authError?.message ?? "El email ya está registrado." }, { status: 400 });
    }
    userId = existente.id;
    console.log("[create-user] email ya existía en auth.users — se reutiliza para el perfil", { email, userId });
  }

  const { error: perfilError } = await supabaseAdmin
    .from("perfiles")
    .upsert({ id: userId, nombre, email, rol, codigo, activo: true }, { onConflict: "id" });

  if (perfilError) {
    console.error("[create-user] fallo al upsert en perfiles — el usuario SÍ existe en auth.users", { email, userId, perfilError });
    return Response.json({ error: perfilError.message }, { status: 400 });
  }

  console.log("[create-user] éxito", { userId, email });
  return Response.json({ id: userId });
});
