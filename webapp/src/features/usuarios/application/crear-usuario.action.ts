"use server";

import { createClient } from "@/shared/infrastructure/supabase/server-client";

// Réplica de saveUser() en su rama de creación (index.html ~3754-3777,
// USR-08): la Edge Function `create-user` es la única que puede usar la
// service_role key (docs/02-arquitectura.md § 2.6/2.7 — nunca desde código
// que responde a una petición de usuario). Se le pasa el propio token de
// sesión del usuario, igual que el original — la función decide con esa
// identidad si quien llama puede crear usuarios; la creación real en
// auth.users + el insert/upsert en `perfiles` ocurren dentro de la propia
// función.
//
// H-01 (cerrado 2026-08-04): la validación de "contraseña mínimo 8
// caracteres" y "código obligatorio" NO vive aquí — vive solo en
// `UsuarioModal` (réplica exacta de esos mismos checks en `saveUser()`,
// ~3756-3757) — esta acción también la usa la importación masiva, cuyo
// equivalente original (`confirmImport()`, ~5732-5765) nunca aplicó esas
// dos comprobaciones.
export async function crearUsuario(input: {
  nombre: string;
  email: string;
  password: string;
  rol: string;
  codigo: string;
}): Promise<{ error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!input.nombre || !input.email) return { error: "Nombre y email son obligatorios." };
  if (!input.password) return { error: "La contraseña es obligatoria." };

  const supabase = await createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return { error: "Sesión no válida." };

  const url = `${supabaseUrl}/functions/v1/create-user`;
  const body = { nombre: input.nombre, email: input.email, password: input.password, rol: input.rol, codigo: input.codigo };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify(body),
    });
    const rawText = await res.text();
    let data: { error?: string; id?: string } = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch (parseErr) {
      console.error("[crearUsuario] el cuerpo de la respuesta no es JSON válido", { email: input.email, rawText, parseErr });
    }

    if (!res.ok) {
      console.error("[crearUsuario] la Edge Function create-user respondió con error", { status: res.status, email: input.email, data });
      return { error: data.error || `Error al crear usuario (HTTP ${res.status}).` };
    }
    return {};
  } catch (err) {
    console.error("[crearUsuario] excepción al invocar la Edge Function create-user", {
      email: input.email,
      url,
      errMessage: err instanceof Error ? err.message : String(err),
    });
    return { error: `Error al invocar la Edge Function: ${err instanceof Error ? err.message : String(err)}` };
  }
}
