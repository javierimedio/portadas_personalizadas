"use server";

import { createClient } from "@/shared/infrastructure/supabase/server-client";

// Réplica de saveUser() en su rama de creación (index.html ~3754-3777,
// USR-08): la Edge Function `create-user` es la única que puede usar la
// service_role key (docs/02-arquitectura.md § 2.6/2.7 — nunca desde código
// que responde a una petición de usuario). Se le pasa el propio token de
// sesión del usuario, igual que el original — la función decide con esa
// identidad si quien llama puede crear usuarios; la creación real en
// auth.users + el insert en `perfiles` ocurren dentro de la propia función.
export async function crearUsuario(input: {
  nombre: string;
  email: string;
  password: string;
  rol: string;
  codigo: string;
}): Promise<{ error?: string }> {
  if (!input.nombre || !input.email) return { error: "Nombre y email son obligatorios." };
  if (!input.password || input.password.length < 8) return { error: "La contraseña debe tener mínimo 8 caracteres." };
  if (!input.codigo) return { error: "El código de usuario es obligatorio." };

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
    if (!res.ok) return { error: data.error || "Error al crear usuario." };
    return {};
  } catch {
    return { error: "Error al crear usuario." };
  }
}
