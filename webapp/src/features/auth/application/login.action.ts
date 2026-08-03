"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/shared/infrastructure/supabase/server-client";

// Réplica de doLogin() en index.html (~1714-1723): valida campos vacíos antes
// de llamar a Supabase, y ante cualquier error de Supabase muestra siempre el
// mismo mensaje genérico (AUT-02) — nunca el mensaje real del backend.
export type LoginState = { error: string } | null;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Introduce tu correo y contraseña." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Correo o contraseña incorrectos." };
  }

  redirect("/");
}
