// Copia para el proyecto Supabase de DESARROLLO de la Edge Function
// `create-user` existente en producción. Usa la service_role key propia de
// este proyecto (gestionada por Supabase, `supabase secrets set` — nunca en
// el .env de la app Next.js). Ver docs/03-modelo-datos.md § 2.5/USR-08 y
// docs/09-matriz-paridad-funcional.md.
//
// TODO antes de dar esto por terminado en la Fase 0: obtener el código REAL
// de la función `create-user` de producción (`supabase functions download
// create-user` o copiarlo desde el dashboard) — este archivo es un
// placeholder que reproduce el comportamiento documentado (alta de usuario
// vía Auth Admin API + insert en `perfiles`), NO una copia verificada línea
// a línea del original. No desplegar sin confirmar que coincide.

import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  const { email, password, nombre, rol, codigo } = await req.json();

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authUser.user) {
    return Response.json({ error: authError?.message ?? "No se pudo crear el usuario" }, { status: 400 });
  }

  const { error: perfilError } = await supabaseAdmin.from("perfiles").insert({
    id: authUser.user.id,
    nombre,
    email,
    rol,
    codigo,
    activo: true,
  });

  if (perfilError) {
    return Response.json({ error: perfilError.message }, { status: 400 });
  }

  return Response.json({ id: authUser.user.id });
});
