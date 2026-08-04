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
  if (!input.nombre || !input.email) return { error: "Nombre y email son obligatorios." };
  if (!input.password) return { error: "La contraseña es obligatoria." };

  const supabase = await createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return { error: "Sesión no válida." };

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({
        nombre: input.nombre,
        email: input.email,
        password: input.password,
        rol: input.rol,
        codigo: input.codigo,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("crearUsuario: la Edge Function create-user respondió con error", { status: res.status, email: input.email, data });
      return { error: data.error || "Error al crear usuario." };
    }
    return {};
  } catch (err) {
    console.error("crearUsuario: fallo al invocar la Edge Function create-user", { email: input.email, err });
    return { error: "Error al crear usuario." };
  }
}
