"use server";

import { createClient } from "@/shared/infrastructure/supabase/server-client";

// Réplica de saveUser() en su rama de creación (index.html ~3754-3777,
// USR-08): la Edge Function `create-user` es la única que puede usar la
// service_role key (docs/02-arquitectura.md § 2.6/2.7 — nunca desde código
// que responde a una petición de usuario). Se le pasa el propio token de
// sesión del usuario, igual que el original — la función decide con esa
// identidad si quien llama puede crear usuarios; la creación real en
// auth.users + el insert en `perfiles` ocurren dentro de la propia función.
//
// H-01: la validación de "contraseña mínimo 8 caracteres" y "código
// obligatorio" NO vive aquí — vive solo en `UsuarioModal` (réplica exacta
// de esos mismos checks en `saveUser()`, ~3756-3757), porque esta acción
// también la usa la importación masiva (`ImportarUsuariosModal`), cuyo
// equivalente original (`confirmImport()`, ~5732-5765) nunca aplicó esas
// dos comprobaciones — enviaba lo que hubiera en el Excel tal cual al
// Admin API. Tenerlas aquí como guardas bloqueantes hacía fallar el 100%
// de las filas de cualquier import con contraseñas de menos de 8
// caracteres o sin columna de código, sin llegar a llamar nunca a
// Supabase (de ahí "0 creados, N errores" sin ninguna petición visible en
// los logs de Supabase ni ninguna excepción en la consola del navegador:
// el error se generaba y se devolvía antes de la primera llamada de red,
// dentro de un Server Action que además corre en el servidor, no en el
// navegador).
export async function crearUsuario(input: {
  nombre: string;
  email: string;
  password: string;
  rol: string;
  codigo: string;
}): Promise<{ error?: string }> {
  // INSTRUMENTACIÓN TEMPORAL (2026-08-04) — diagnóstico en curso de "0
  // creados, N errores" (docs/09-matriz-paridad-funcional.md § H-01). No
  // quitar hasta confirmar en qué línea exacta se genera el error. Esto
  // corre en el SERVIDOR: aparece en la terminal de `next dev`/`next
  // start`, o en Vercel → Deployments → Functions → Logs — NUNCA en la
  // consola del navegador, porque esta función tiene "use server".
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  console.log("[crearUsuario] input recibido", {
    nombre: input.nombre,
    email: input.email,
    rol: input.rol,
    codigo: input.codigo,
    passwordPresente: Boolean(input.password),
    passwordLength: input.password?.length ?? 0,
    supabaseUrlConfigurado: Boolean(supabaseUrl),
  });

  if (!input.nombre || !input.email) {
    console.warn("[crearUsuario] rechazado antes de cualquier llamada de red: falta nombre o email");
    return { error: "Nombre y email son obligatorios." };
  }
  if (!input.password) {
    console.warn("[crearUsuario] rechazado antes de cualquier llamada de red: falta password");
    return { error: "La contraseña es obligatoria." };
  }

  const supabase = await createClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  console.log("[crearUsuario] resultado de auth.getSession()", {
    haySesion: Boolean(sessionData.session),
    sessionError: sessionError?.message ?? null,
  });
  if (!sessionData.session) {
    console.warn("[crearUsuario] rechazado antes de cualquier llamada de red: sin sesión válida");
    return { error: "Sesión no válida." };
  }

  const url = `${supabaseUrl}/functions/v1/create-user`;
  const body = { nombre: input.nombre, email: input.email, password: input.password, rol: input.rol, codigo: input.codigo };
  console.log("[crearUsuario] invocando la Edge Function create-user", { url, body: { ...body, password: `(${body.password.length} caracteres)` } });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify(body),
    });
    console.log("[crearUsuario] respuesta HTTP recibida", { status: res.status, ok: res.ok, statusText: res.statusText, contentType: res.headers.get("content-type") });

    const rawText = await res.text();
    console.log("[crearUsuario] cuerpo de la respuesta (texto crudo)", rawText);

    let data: { error?: string; id?: string } = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch (parseErr) {
      console.error("[crearUsuario] el cuerpo de la respuesta no es JSON válido", { rawText, parseErr });
    }
    console.log("[crearUsuario] cuerpo de la respuesta (parseado)", data);

    if (!res.ok) {
      console.error("[crearUsuario] la Edge Function create-user respondió con error", { status: res.status, email: input.email, data });
      return { error: data.error || "Error al crear usuario." };
    }
    console.log("[crearUsuario] éxito", { email: input.email, id: data.id });
    return {};
  } catch (err) {
    console.error("[crearUsuario] excepción al invocar la Edge Function create-user", {
      email: input.email,
      url,
      errName: err instanceof Error ? err.name : typeof err,
      errMessage: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return { error: "Error al crear usuario." };
  }
}
