-- ============================================================================
-- Envío real de email — Outbox + pg_cron + Edge Function `send-notifications`
-- (arquitectura acordada 2026-08-05, ver conversación de diseño).
-- ============================================================================
-- `notificaciones` ya funcionaba como cola (enviado=false hasta que algo la
-- procese) — esta migración solo añade lo necesario para que ese "algo" sea
-- robusto: trazabilidad de intentos/errores, y un mecanismo de reclamo con
-- caducidad automática para que una ejecución que falla a mitad (crash,
-- timeout) no deje filas bloqueadas para siempre.
--
-- Modelo:
-- - `intentos`: cuántas veces se ha intentado enviar esta fila.
-- - `ultimo_intento_at` / `ultimo_error`: para diagnosticar sin adivinar.
-- - `bloqueado_hasta`: lease de reclamo — mientras esté en el futuro, ninguna
--   otra invocación puede volver a reclamar la fila; una vez pasado (porque
--   la invocación anterior terminó bien, mal, o ni siquiera terminó), vuelve
--   a estar disponible sola, sin ninguna intervención manual.
-- - Tras `p_max_intentos` intentos sin éxito, la fila deja de ofrecerse (sigue
--   con `enviado=false`, visible para diagnóstico, pero no se reintenta más
--   indefinidamente).
-- ============================================================================

alter table notificaciones
  add column if not exists intentos integer not null default 0,
  add column if not exists ultimo_intento_at timestamptz,
  add column if not exists ultimo_error text,
  add column if not exists bloqueado_hasta timestamptz;

-- Reclama de forma atómica un lote de notificaciones pendientes: las marca
-- como "en curso" (bloqueado_hasta) y cuenta el intento en la misma
-- operación, así que dos invocaciones simultáneas (aunque hoy solo exista un
-- disparador, pg_cron) nunca pueden llevarse la misma fila — `for update
-- skip locked` es la misma garantía a nivel de fila que ya usa Postgres para
-- colas de trabajo concurrentes.
create or replace function reclamar_notificaciones_pendientes(
  p_lote integer default 50,
  p_max_intentos integer default 5,
  p_lease_minutos integer default 2
)
returns setof notificaciones
language plpgsql
as $$
begin
  return query
  update notificaciones
  set bloqueado_hasta = now() + (p_lease_minutos || ' minutes')::interval,
      intentos = intentos + 1,
      ultimo_intento_at = now()
  where id in (
    select id from notificaciones
    where enviado = false
      and intentos < p_max_intentos
      and (bloqueado_hasta is null or bloqueado_hasta < now())
    order by created_at
    limit p_lote
    for update skip locked
  )
  returning *;
end;
$$;
