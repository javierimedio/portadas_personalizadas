import { createBrowserClient } from "@supabase/ssr";

// Cliente para componentes cliente que necesitan Realtime (WebSocket) —
// server-client.ts no sirve aquí porque corre en el servidor. Comparte
// sesión con el servidor vía las mismas cookies (@supabase/ssr).
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
