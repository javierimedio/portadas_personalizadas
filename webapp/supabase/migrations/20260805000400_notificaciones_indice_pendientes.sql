-- ============================================================================
-- Índice parcial para que `reclamar_notificaciones_pendientes()` siga siendo
-- rápida cuando `notificaciones` acumule miles de filas históricas ya
-- enviadas — la tabla no borra nunca filas antiguas (es historial), así que
-- sin este índice el filtro `where enviado = false` degradaría con el
-- tiempo. Solo indexa las filas pendientes (enviado = false), que en
-- cualquier momento dado son una fracción pequeña del total.
-- ============================================================================

create index if not exists notificaciones_pendientes_idx
  on notificaciones (created_at)
  where enviado = false;
