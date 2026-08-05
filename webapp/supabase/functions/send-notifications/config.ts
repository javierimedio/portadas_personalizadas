// Configuración centralizada del lado de ENVÍO de notificaciones (Edge
// Function `send-notifications`). Ningún valor de aquí debe repetirse como
// literal suelto en `index.ts` — cualquier ajuste (tamaño de lote,
// reintentos, remitente...) se hace en este único archivo.
//
// ⚠️ Se despliega junto con `index.ts` como parte de la misma Edge Function
// (Dashboard → Edge Functions → send-notifications → editor → añadir este
// archivo además de index.ts, o `supabase functions deploy` si se usa la
// CLI). Sin este archivo, `index.ts` no compila.
export const CONFIG = {
  // Cuántas notificaciones pendientes procesa como máximo una sola
  // invocación de la función.
  LOTE: 50,

  // Intentos máximos antes de dejar de reintentar una notificación. Al
  // llegar a este número, la fila sigue con enviado=false (visible para
  // diagnóstico vía ultimo_error/intentos) pero deja de ofrecerse a
  // `reclamar_notificaciones_pendientes()`.
  MAX_INTENTOS: 5,

  // Minutos que queda reservada una notificación reclamada antes de que
  // otra invocación pueda volver a intentarla, si la anterior no llegó a
  // terminar (crash, timeout de la función, etc.). Debe ser mayor que
  // CRON_FRECUENCIA_MINUTOS para que, en el caso normal (la invocación
  // anterior termina bien), no compita consigo misma en la siguiente
  // ejecución.
  LEASE_MINUTOS: 2,

  // Frecuencia real del disparador — la define el propio `cron.schedule()`
  // en Supabase (SQL, ver docs/10-auditoria-despliegue-manual.md), no este
  // código. Este valor es solo documentación, para que LEASE_MINUTOS se
  // pueda revisar con criterio si el cron cambia de frecuencia.
  CRON_FRECUENCIA_MINUTOS: 1,

  // Nombre visible del remitente en el email (cabecera "From"). La
  // dirección de envío real no es configurable aquí a propósito: la fija
  // siempre el secreto SMTP_USER (Dashboard → Edge Functions → Secrets),
  // porque la mayoría de proveedores SMTP exigen enviar desde la propia
  // cuenta autenticada o un alias verificado — no un valor libre.
  REMITENTE_NOMBRE: "Portadas GOR",

  // Nombre del secret de autenticación del cron (Dashboard → Edge Functions
  // → Secrets). Su VALOR no vive aquí — es un string aleatorio que el
  // propietario del proyecto genera, almacena en Secrets y pone también en
  // la cabecera Authorization del cron.schedule(). Solo el nombre del secret
  // se centraliza aquí para que index.ts y docs/10 sean siempre coherentes
  // sin repetir el literal "CRON_SECRET" en varios sitios.
  CRON_SECRET_ENV: "CRON_SECRET",
};
