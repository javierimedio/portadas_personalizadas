// Configuración centralizada del lado de GENERACIÓN de notificaciones
// (Next.js). El lado de ENVÍO real por email tiene su propia configuración
// aparte, dentro de `webapp/supabase/functions/send-notifications/config.ts`
// — corre en un runtime distinto (Deno) y se despliega como una unidad de
// código independiente, así que no pueden compartir un mismo archivo.
export const ASUNTO_BASE = "[Portadas GOR]";
