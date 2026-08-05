-- ============================================================================
-- Corrige "no llegan notificaciones dentro de la aplicación".
-- ============================================================================
-- `20260731000100_enable_rls_and_policies.sql` activa RLS en `notificaciones`
-- (`drop policy if exists allow_all`) y define `notificaciones_select`,
-- `notificaciones_update` y `notificaciones_delete` — pero NUNCA definió una
-- policy `for insert`. Sin ninguna policy de inserción, RLS deniega el
-- insert a TODO el mundo por defecto (ninguna política = denegar), así que
-- cada llamada de `enviarNotificacion()`/`enviarNotificacionAsignacion()`/
-- `enviarNotificacionesMencion()` (`features/notificaciones/application/
-- enviar-notificacion.ts`) fallaba con "new row violates row-level security
-- policy for table notificaciones" — nunca comprobado por ese código (no lee
-- el `error` del `.insert(...)`, exactamente el mismo patrón de fallo
-- silencioso ya visto en H-01 y en la auto-adjudicación), así que la fila
-- nunca se creaba y ni el icono de la campana ni el panel de notificaciones
-- tenían nada que mostrar. Las menciones con `@` (`addComentario()`) y los
-- cambios de estado que disparan aviso pasan por el mismo insert, así que
-- estaban igualmente rotos.
--
-- Mismo patrón que `logs_insert`/`adjuntos_insert` (ya en la migración
-- original): cualquier usuario autenticado puede insertar una notificación
-- para OTRO destinatario (es la forma normal de uso — un comercial notifica
-- a marketing, un diseñador a un comercial, etc., igual que en index.html,
-- que nunca restringía esto), siempre que la solicitud referenciada exista.
-- ============================================================================

drop policy if exists notificaciones_insert on notificaciones;

create policy notificaciones_insert on notificaciones for insert
with check (exists (select 1 from solicitudes s where s.id = notificaciones.solicitud_id));
